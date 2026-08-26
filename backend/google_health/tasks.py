from celery import shared_task
from django.utils import timezone
from django.db import models
from datetime import datetime
import requests

from google_health.services import GoogleAuthService
from google_health.models import (
    Alert, GoogleAccount, Assignment, PhysiologicalData,
    SyncLog, VariableType, AlertType, trigger_alert
)

API_BASE = "https://health.googleapis.com/v4/users/me/dataTypes"

# Variables que se acumulan como total diario 
DAILY_AGGREGATE_VARIABLES = [VariableType.STEPS, VariableType.DISTANCE]


def parse_time(value, fallback):
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')) if value else fallback
    except Exception:
        return fallback


def extract_sleep(point, now):
    interval = point.get('interval', {})
    summary = point.get('summary', {})
    start_time = parse_time(interval.get('startTime'), now)
    end_time = parse_time(interval.get('endTime'), now)
    results = []

    def add_summary_field(field_name, variable_type):
        raw = summary.get(field_name)
        val = float(raw) if raw is not None and float(raw) > 0 else None
        if field_name in summary:
            results.append((variable_type, start_time, val, start_time, end_time))

    add_summary_field('minutesInSleepPeriod', VariableType.SLEEP_DURATION)
    add_summary_field('minutesAsleep', VariableType.SLEEP_MINUTES_ASLEEP)          
    add_summary_field('minutesAwake', VariableType.SLEEP_AWAKE)
    add_summary_field('minutesAfterWakeUp', VariableType.SLEEP_AFTER_WAKE_UP)   
    add_summary_field('minutesToFallAsleep', VariableType.SLEEP_MINUTES_TO_FALL_ASLEEP)

    # Fases del sueño (Light, Deep, REM)
    stage_map = {
        'LIGHT': VariableType.SLEEP_LIGHT,
        'DEEP': VariableType.SLEEP_DEEP,
        'REM': VariableType.SLEEP_REM,
    }
    for stage in summary.get('stagesSummary', []):
        stage_type = stage.get('type')
        if stage_type in stage_map:
            raw_minutes = stage.get('minutes')
            minutes_val = float(raw_minutes) if raw_minutes is not None and float(raw_minutes) > 0 else None
            results.append((stage_map[stage_type], start_time, minutes_val, start_time, end_time))

    # Hora de inicio y fin 
    if start_time:
        results.append((VariableType.SLEEP_START, start_time, None, start_time, end_time))
    if end_time:
        results.append((VariableType.SLEEP_END, end_time, None, start_time, end_time))

    return results


def extract_heart_rate(point, now):
    sample_time_str = point.get('sampleTime', {}).get('physicalTime')
    physical_time = parse_time(sample_time_str, now)
    raw_value = point.get('beatsPerMinute')
    value = float(raw_value) if raw_value is not None and float(raw_value) > 0 else None
    return [(VariableType.HEART_RATE, physical_time, value, physical_time, physical_time)]


def extract_daily_resting_heart_rate(point, now):
    date_info = point.get('date', {})
    year = date_info.get('year', now.year)
    month = date_info.get('month', now.month)
    day = date_info.get('day', now.day)
    
    # Esta variable no tieme DateTime sino Date únicamente 
    from datetime import timezone as dt_timezone
    day_dt = datetime(year, month, day, 0, 0, 0, tzinfo=dt_timezone.utc)
    
    raw_value = point.get('beatsPerMinute')
    value = float(raw_value) if raw_value is not None and float(raw_value) > 0 else None
    return [(VariableType.HEART_RATE_RESTING, day_dt, value, None, None)]

def extract_daily_hrv(point, now):
    date_info = point.get('date', {})
    day_dt = datetime(
        date_info.get('year', now.year),
        date_info.get('month', now.month),
        date_info.get('day', now.day),
        tzinfo=now.tzinfo
    )
    results = []

    # averageHeartRateVariabilityMilliseconds -> HRV_AVERAGE_MS
    avg_hrv = point.get('averageHeartRateVariabilityMilliseconds')
    if avg_hrv is not None and float(avg_hrv) > 0:
        results.append((VariableType.HRV_AVERAGE_MS, day_dt, float(avg_hrv), None, None))

    # entropy -> HRV_ENTROPY
    entropy = point.get('entropy')
    if entropy is not None and float(entropy) > 0:
        results.append((VariableType.HRV_ENTROPY, day_dt, float(entropy), None, None))

    # nonRemHeartRateBeatsPerMinute -> HRV_NON_REM_HR
    non_rem_hr = point.get('nonRemHeartRateBeatsPerMinute')
    if non_rem_hr is not None and float(non_rem_hr) > 0:
        results.append((VariableType.HRV_NON_REM_HR, day_dt, float(non_rem_hr), None, None))

    # deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds -> HRV_RMSSD
    rmssd = point.get('deepSleepRootMeanSquareOfSuccessiveDifferencesMilliseconds')
    if rmssd is not None and float(rmssd) > 0:
        results.append((VariableType.HRV_RMSSD, day_dt, float(rmssd), None, None))

    return results


def extract_respiratory_rate(point, now):
    summary = point.get('respiratoryRateSleepSummary', point)    
    sample_time_str = summary.get('sampleTime', {}).get('physicalTime')
    physical_time = parse_time(sample_time_str, now)
    results = []

    stats_mapping = [
        ('fullSleepStats', VariableType.RESPIRATORY_RATE_NOCTURNAL),
        ('lightSleepStats', VariableType.RESPIRATORY_RATE_LIGHT),
        ('deepSleepStats', VariableType.RESPIRATORY_RATE_DEEP),
        ('remSleepStats', VariableType.RESPIRATORY_RATE_REM),
    ]

    for stat_key, var_type in stats_mapping:
        stat_data = summary.get(stat_key, {})
        raw_value = stat_data.get('breathsPerMinute')
        value = float(raw_value) if raw_value is not None and float(raw_value) > 0 else None
        
        if value is not None and physical_time:
            results.append((var_type, physical_time, value, physical_time, physical_time))

    return results


def extract_heart_rate_zones(point, now):
    date_info = point.get('date', {})
    day = datetime(
        date_info.get('year', now.year),
        date_info.get('month', now.month),
        date_info.get('day', now.day),
        tzinfo=now.tzinfo
    )
    zones = point.get('heartRateZones', [])
    zone_map = {
        'LIGHT': VariableType.HR_ZONE_FAT_BURN,
        'MODERATE': VariableType.HR_ZONE_CARDIO,
        'PEAK': VariableType.HR_ZONE_PEAK,
    }

    results = []
    for zone in zones:
        zone_type = zone.get('heartRateZoneType')
        if zone_type in zone_map:
            raw_minutes = zone.get('minutes', zone.get('durationMinutes'))
            minutes = float(raw_minutes) if raw_minutes is not None and float(raw_minutes) > 0 else None
            results.append((zone_map[zone_type], day, minutes, None, None))

    return results


def extract_active_zone_minutes(point, now):
    interval = point.get('interval', {})
    start_time = parse_time(interval.get('startTime'), now)
    end_time = parse_time(interval.get('endTime'), now)    
    heart_rate_zone = point.get('heartRateZone')
    
    zone_map = {
        'FAT_BURN': VariableType.HR_ZONE_FAT_BURN,
        'CARDIO': VariableType.HR_ZONE_CARDIO,
        'PEAK': VariableType.HR_ZONE_PEAK,
    }
    
    variable_type = zone_map.get(heart_rate_zone, VariableType.ACTIVE_ZONE_MINUTES)
    
    raw_value = point.get('activeZoneMinutes')
    value = float(raw_value) if raw_value is not None and float(raw_value) > 0 else None
    
    if value is None:
        return []
        
    return [(variable_type, start_time, value, start_time, end_time)]


def extract_steps(point, now):
    interval = point.get('interval', {})
    start_time = parse_time(interval.get('startTime'), now)
    end_time = parse_time(interval.get('endTime'), now)
    raw_value = point.get('count')
    value = float(raw_value) if raw_value is not None and float(raw_value) > 0 else None
    return [(VariableType.STEPS, start_time, value, start_time, end_time)]


def extract_distance(point, now):
    interval = point.get('interval', {})
    start_time = parse_time(interval.get('startTime'), now)
    end_time = parse_time(interval.get('endTime'), now)
    millimeters = point.get('millimeters')
    
    value = (
        float(millimeters) / 1_000_000.0
        if millimeters is not None and float(millimeters) > 0
        else None
    )
    return [(VariableType.DISTANCE, start_time, value, start_time, end_time)]


ENDPOINTS = [
    {"endpoint_path": "sleep", "data_key": "sleep", "extractor": extract_sleep},
    {"endpoint_path": "steps", "data_key": "steps", "extractor": extract_steps},
    {"endpoint_path": "distance", "data_key": "distance", "extractor": extract_distance},
    {"endpoint_path": "heart-rate", "data_key": "heartRate", "extractor": extract_heart_rate},
    {"endpoint_path": "daily-resting-heart-rate", "data_key": "dailyRestingHeartRate", "extractor": extract_daily_resting_heart_rate},
    {"endpoint_path": "daily-heart-rate-variability", "data_key": "dailyHeartRateVariability", "extractor": extract_daily_hrv},
    {"endpoint_path": "respiratory-rate-sleep-summary", "data_key": "respiratoryRateSleepSummary", "extractor": extract_respiratory_rate},
    {"endpoint_path": "daily-heart-rate-zones", "data_key": "dailyHeartRateZones", "extractor": extract_heart_rate_zones},
    {"endpoint_path": "active-zone-minutes", "data_key": "activeZoneMinutes", "extractor": extract_active_zone_minutes},
]


@shared_task
def sync_all_users_data():
    accounts = GoogleAccount.objects.filter(authentication_status='ACTIVE')
    now = timezone.now()

    for account in accounts:
        try:
            success = GoogleAuthService.refresh_access_token(account)
            if not success:
                SyncLog.objects.create(google_account=account, result='TOKEN_ERROR', downloaded_records=0)
                continue

            assignment = Assignment.objects.filter(
                participant=account.participant,
                start_date__lte=now,
                real_end_date__isnull=True
            ).first()

            if not assignment:
                continue

            # -----------------------------------------------------
            # Gestión de alertas automáticas

            has_records = PhysiologicalData.objects.filter(assignment=assignment).exists()
            if not has_records:
                trigger_alert(AlertType.NO_RECORDS, google_account=account, assignment=assignment)
            else:
                Alert.objects.filter(assignment=assignment, alert_type=AlertType.NO_RECORDS, resolved=False).update(
                    resolved=True, resolved_at=timezone.now()
                )

            last_record = PhysiologicalData.objects.filter(assignment=assignment).order_by('-physical_time').first()
            if last_record:
                time_diff = now - last_record.physical_time
                if time_diff.total_seconds() > 86400:
                    trigger_alert(AlertType.NO_DATA_24H, google_account=account, assignment=assignment)
                else:
                    Alert.objects.filter(assignment=assignment, alert_type=AlertType.NO_DATA_24H, resolved=False).update(
                        resolved=True, resolved_at=timezone.now()
                    )

            # Descarga y procesamiento

            total_downloaded = 0
            headers = {"Authorization": f"Bearer {account.access_token}"}
            daily_totals = {}   # Acumuladores diarios para variables tipo STEPS/DISTANCE

            for endpoint in ENDPOINTS:
                url = f"{API_BASE}/{endpoint['endpoint_path']}/dataPoints"
                response = requests.get(url, headers=headers)

                if response.status_code != 200:
                    continue

                data = response.json()
                points = data.get('dataPoints', [])
                endpoint_downloaded = 0

                for point in points:
                    device_info = point.get('dataSource', {}).get('device', {})
                    device_name = device_info.get('displayName') or 'Fitbit Device'
                    platform = point.get('dataSource', {}).get('platform') or 'FITBIT'
                    recording_method = point.get('dataSource', {}).get('recordingMethod') or 'UNKNOWN'

                    payload = point.get(endpoint['data_key'], point)
                    extracted = endpoint['extractor'](payload, now)

                    for variable_type, physical_time, metric_value, start_time, end_time in extracted:
                        if physical_time is None:
                            continue
                        if metric_value is None and variable_type not in [VariableType.SLEEP_START, VariableType.SLEEP_END]:
                            continue

                        if variable_type in DAILY_AGGREGATE_VARIABLES:
                            # PASOS y DISTANCIA: se acumulan en memoria durante todo el ciclo
                            day_date = start_time.date() if start_time else physical_time.date()
                            key = (variable_type, day_date)

                            if key not in daily_totals:
                                daily_totals[key] = {
                                    'sum': 0.0,
                                    'earliest_start': start_time or physical_time,
                                    'latest_end': end_time or physical_time,
                                    'device_name': device_name,
                                    'platform': platform,
                                    'recording_method': recording_method,
                                }

                            daily_totals[key]['sum'] += metric_value

                            candidate_start = start_time or physical_time
                            if candidate_start < daily_totals[key]['earliest_start']:
                                daily_totals[key]['earliest_start'] = candidate_start

                            candidate_end = end_time or physical_time
                            if candidate_end > daily_totals[key]['latest_end']:
                                daily_totals[key]['latest_end'] = candidate_end

                        else:
                            PhysiologicalData.objects.get_or_create(
                                assignment=assignment,
                                variable_type=variable_type,
                                physical_time=physical_time,
                                defaults={
                                    'metric_value': metric_value,
                                    'start_time': start_time or physical_time,
                                    'end_time': end_time or physical_time,
                                    'device_name': device_name,
                                    'platform': platform,
                                    'recording_method': recording_method,
                                }
                            )

                        endpoint_downloaded += 1

                total_downloaded += endpoint_downloaded

            # Para STEPS y DISTANCE se reemplaza el valor anterior por el total recalculado de este ciclo.
            for (variable_type, day_date), info in daily_totals.items():
                obj, created = PhysiologicalData.objects.get_or_create(
                    assignment=assignment,
                    variable_type=variable_type,
                    physical_time__date=day_date,
                    defaults={
                        'physical_time': info['earliest_start'],
                        'metric_value': info['sum'],
                        'start_time': info['earliest_start'],
                        'end_time': info['latest_end'],
                        'device_name': info['device_name'],
                        'platform': info['platform'],
                        'recording_method': info['recording_method'],
                    }
                )
                if not created:
                    obj.metric_value = info['sum']
                    obj.end_time = info['latest_end']
                    obj.save()

            SyncLog.objects.create(
                google_account=account,
                result='SUCCESS',
                downloaded_records=total_downloaded
            )

        except Exception as e:
            SyncLog.objects.create(
                google_account=account,
                result=f'ERROR: {str(e)[:50]}',
                downloaded_records=0
            )