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

    # Duración total del sueño
    raw_sleep_duration = summary.get('minutesInSleepPeriod')
    sleep_duration = float(raw_sleep_duration) if raw_sleep_duration is not None and float(raw_sleep_duration) > 0 else None
    if 'minutesInSleepPeriod' in summary:
        results.append((VariableType.SLEEP_DURATION, start_time, sleep_duration, start_time, end_time))

    # Minutos despierto
    raw_awake = summary.get('minutesAwake')
    awake_val = float(raw_awake) if raw_awake is not None and float(raw_awake) > 0 else None
    if 'minutesAwake' in summary:
        results.append((VariableType.SLEEP_AWAKE, start_time, awake_val, start_time, end_time))

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

    duration_minutes = (end_time - start_time).total_seconds() / 60 if start_time and end_time else None
    results.append((VariableType.SLEEP_START_END, start_time, duration_minutes, start_time, end_time))

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
    day_dt = datetime(year, month, day, tzinfo=now.tzinfo)
    raw_value = point.get('beatsPerMinute')
    value = float(raw_value) if raw_value is not None and float(raw_value) > 0 else None  
    return [(VariableType.HEART_RATE_RESTING, day_dt, value, None, None)]


def extract_daily_hrv(point, now):
    sample_time_str = point.get('sampleTime', {}).get('physicalTime')
    physical_time = parse_time(sample_time_str, now)
    raw_value = point.get('rootMeanSquareOfSuccessiveDifferencesMilliseconds')
    value = float(raw_value) if raw_value is not None and float(raw_value) > 0 else None  
    return [(VariableType.HRV_NOCTURNAL, physical_time, value, physical_time, physical_time)]


def extract_respiratory_rate(point, now):
    sample_time_str = point.get('sampleTime', {}).get('physicalTime')
    physical_time = parse_time(sample_time_str, now)
    stats = point.get('fullSleepStats', point.get('lightSleepStats', {}))
    raw_value = stats.get('breathsPerMinute')
    value = float(raw_value) if raw_value is not None and float(raw_value) > 0 else None  
    return [(VariableType.RESPIRATORY_RATE_NOCTURNAL, physical_time, value, physical_time, physical_time)]


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
    raw_value = point.get('activeZoneMinutes')
    value = float(raw_value) if raw_value is not None and float(raw_value) > 0 else None
    return [(VariableType.ACTIVE_ZONE_MINUTES, start_time, value, start_time, end_time)]


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
    if millimeters is not None and float(millimeters) > 0:
        value = float(millimeters) / 1000.0
    else:
        value = None
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
    
    retention_days = 7
    cutoff = now - timezone.timedelta(days=retention_days)

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

            total_downloaded = 0
            headers = {"Authorization": f"Bearer {account.access_token}"}

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
                        if metric_value is None or physical_time is None:
                            continue

                        # Para PASOS y DISTANCIA --> Acumulativo diario
                        if variable_type in [VariableType.STEPS, VariableType.DISTANCE]:
                            day_date = start_time.date() if start_time else physical_time.date()
                            
                            obj, created = PhysiologicalData.objects.get_or_create(
                                assignment=assignment,
                                variable_type=variable_type,
                                physical_time__date=day_date,
                                defaults={
                                    'physical_time': physical_time,
                                    'metric_value': metric_value,
                                    'start_time': start_time or physical_time,
                                    'end_time': end_time or physical_time,
                                    'device_name': device_name,
                                    'platform': platform,
                                    'recording_method': recording_method,
                                }
                            )
                            
                            if not created:
                                obj.metric_value = metric_value 
                                obj.end_time = end_time or physical_time
                                obj.save()
                        
                        else:
                            if not physical_time:
                                continue

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