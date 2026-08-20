from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import models
from datetime import datetime
import requests
from google_health.services import GoogleAuthService
from google_health.models import Alert, GoogleAccount, Assignment, PhysiologicalData, SyncLog, VariableType, AlertType, trigger_alert

API_BASE = "https://health.googleapis.com/v4/users/me/dataTypes"


def parse_time(value, fallback):
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00')) if value else fallback
    except Exception:
        return fallback


def extract_sleep(point, now):
    """Un único dataPoint 'sleep' trae múltiples variables en su 'summary' y 'stagesSummary'."""
    interval = point.get('interval', {})
    summary = point.get('summary', {})
    start_time = parse_time(interval.get('startTime'), now)
    end_time = parse_time(interval.get('endTime'), now)
    results = []

    if 'minutesInSleepPeriod' in summary:
        results.append((VariableType.SLEEP_DURATION, start_time, float(summary['minutesInSleepPeriod']), start_time, end_time))

    if 'minutesAwake' in summary:
        results.append((VariableType.SLEEP_AWAKE, start_time, float(summary['minutesAwake']), start_time, end_time))

    stage_map = {
        'LIGHT': VariableType.SLEEP_LIGHT,
        'DEEP': VariableType.SLEEP_DEEP,
        'REM': VariableType.SLEEP_REM,
    }
    for stage in summary.get('stagesSummary', []):
        stage_type = stage.get('type')
        if stage_type in stage_map:
            minutes_val = float(stage.get('minutes', 0))
            results.append((stage_map[stage_type], start_time, minutes_val, start_time, end_time))

    duration_minutes = (end_time - start_time).total_seconds() / 60 if start_time and end_time else 0
    results.append((VariableType.SLEEP_START_END, start_time, duration_minutes, start_time, end_time))

    return results


def extract_heart_rate(point, now):
    sample_time_str = point.get('sampleTime', {}).get('physicalTime')
    physical_time = parse_time(sample_time_str, now)    
    value = float(point.get('beatsPerMinute', 0))    
    return [(VariableType.HEART_RATE, physical_time, value, physical_time, physical_time)]


def extract_daily_resting_heart_rate(point, now):
    date_info = point.get('date', {})
    year = date_info.get('year', now.year)
    month = date_info.get('month', now.month)
    day = date_info.get('day', now.day)
    day_dt = datetime(year, month, day, tzinfo=now.tzinfo)
    value = float(point.get('beatsPerMinute', 0))
    return [(VariableType.HEART_RATE_RESTING, day_dt, value, None, None)]


def extract_daily_hrv(point, now):
    sample_time_str = point.get('sampleTime', {}).get('physicalTime')
    physical_time = parse_time(sample_time_str, now)
    value = float(point.get('rootMeanSquareOfSuccessiveDifferencesMilliseconds', 0))
    return [(VariableType.HRV_NOCTURNAL, physical_time, value, physical_time, physical_time)]


def extract_respiratory_rate(point, now):
    sample_time_str = point.get('sampleTime', {}).get('physicalTime')
    physical_time = parse_time(sample_time_str, now)
    stats = point.get('fullSleepStats', point.get('lightSleepStats', {}))
    value = float(stats.get('breathsPerMinute', 0))
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
            minutes = float(zone.get('minutes', zone.get('durationMinutes', 0)))
            results.append((zone_map[zone_type], day, minutes, None, None))
            
    return results


def extract_active_zone_minutes(point, now):
    interval = point.get('interval', {})
    start_time = parse_time(interval.get('startTime'), now)
    end_time = parse_time(interval.get('endTime'), now)
    value = float(point.get('activeZoneMinutes', 0))
    return [(VariableType.ACTIVE_ZONE_MINUTES, start_time, value, start_time, end_time)]


def extract_steps(point, now):
    interval = point.get('interval', {})
    start_time = parse_time(interval.get('startTime'), now)
    end_time = parse_time(interval.get('endTime'), now)    
    value = float(point.get('count', 0))
    return [(VariableType.STEPS, start_time, value, start_time, end_time)]


def extract_distance(point, now):
    interval = point.get('interval', {})
    start_time = parse_time(interval.get('startTime'), now)
    end_time = parse_time(interval.get('endTime'), now)    
    millimeters = float(point.get('millimeters', 0))
    value = millimeters / 1000.0  
    
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

ALL_VARIABLE_TYPES = [choice[0] for choice in VariableType.choices]


class Command(BaseCommand):
    help = 'Descarga variables fisiológicas de Google Health para una o todas las cuentas activas'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default=None,
                             help='Correo electrónico específico a sincronizar. Si se omite, todas las cuentas.')
        parser.add_argument('--variables', type=str, nargs='+', default=None,
                             choices=ALL_VARIABLE_TYPES,
                             help='Variables a descargar. Si se omite, se descargan todas.')

    def handle(self, *args, **options):
        email = options.get('email')
        requested_variables = options.get('variables')

        accounts = GoogleAccount.objects.all()
        if email:
            accounts = accounts.filter(email=email)
            if not accounts.exists():
                self.stdout.write(self.style.ERROR(f'No existe ninguna cuenta con el correo {email}'))
                return
        elif not accounts.exists():
            self.stdout.write(self.style.ERROR('No hay cuentas de Google registradas.'))
            return

        if requested_variables:
            target_endpoints = ENDPOINTS
            variable_filter = set(requested_variables)
        else:
            target_endpoints = ENDPOINTS
            variable_filter = None

        self.stdout.write(f'Endpoints a consultar: {[e["endpoint_path"] for e in target_endpoints]}')
        self.stdout.write(f'Cuentas a procesar: {accounts.count()}')

        now = timezone.now()

        for account in accounts:
            self.stdout.write(f'\nProcesando cuenta: {account.email} ({account.participant.participant_code})')

            success = GoogleAuthService.refresh_access_token(account)
            if not success:
                self.stdout.write(self.style.ERROR(f'Fallo al refrescar token para {account.email}'))
                SyncLog.objects.create(google_account=account, result='TOKEN_ERROR', downloaded_records=0)
                continue

            assignment = Assignment.objects.filter(
                participant=account.participant,
                start_date__lte=now,
            ).filter(
                models.Q(estimated_end_date__isnull=True) | models.Q(estimated_end_date__gte=now)
            ).first()

            if not assignment:
                self.stdout.write(self.style.WARNING(
                    f'El participante {account.participant.participant_code} no tiene asignación activa ahora mismo.'
                ))
                continue

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

            for endpoint in target_endpoints:
                url = f"{API_BASE}/{endpoint['endpoint_path']}/dataPoints"
                response = requests.get(url, headers=headers)

                if response.status_code != 200:
                    self.stdout.write(self.style.ERROR(
                        f" -> Error al consultar {endpoint['endpoint_path']}: {response.status_code}"
                    ))
                    continue

                data = response.json()
                points = data.get('dataPoints', [])
                endpoint_downloaded = 0

                for point in points:
                    device_info = point.get('dataSource', {}).get('device', {})
                    device_name = device_info.get('displayName', 'Fitbit Device')
                    platform = point.get('dataSource', {}).get('platform', 'FITBIT')
                    recording_method = point.get('dataSource', {}).get('recordingMethod', 'UNKNOWN')

                    payload = point.get(endpoint['data_key'], point)
                    extracted = endpoint['extractor'](payload, now)

                    for variable_type, physical_time, metric_value, start_time, end_time in extracted:
                        if variable_filter and variable_type not in variable_filter:
                            continue

                        PhysiologicalData.objects.get_or_create(
                            assignment=assignment,
                            variable_type=variable_type,
                            physical_time=physical_time,
                            defaults={
                                'metric_value': metric_value,
                                'start_time': start_time,
                                'end_time': end_time,
                                'device_name': device_name,
                                'platform': platform,
                                'recording_method': recording_method,
                            }
                        )
                        endpoint_downloaded += 1

                total_downloaded += endpoint_downloaded
                self.stdout.write(self.style.SUCCESS(
                    f" -> {endpoint['endpoint_path']}: {endpoint_downloaded} registros guardados"
                ))

            SyncLog.objects.create(
                google_account=account,
                result='SUCCESS',
                downloaded_records=total_downloaded
            )
            self.stdout.write(self.style.SUCCESS(f'Total registros guardados: {total_downloaded}'))