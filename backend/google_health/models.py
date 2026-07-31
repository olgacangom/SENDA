import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models.signals import post_save, post_delete, pre_delete, pre_save
from django.dispatch import receiver


# ==========================================
# ENUMERADOS
# ==========================================

class AssignmentStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    ACTIVE = 'ACTIVE', 'Active'
    COMPLETED = 'COMPLETED', 'Completed'


class FitbitStatus(models.TextChoices):
    FREE = 'FREE', 'Free'
    IN_USE = 'IN_USE', 'In Use'
    INACTIVE = 'INACTIVE', 'Inactive'
    MAINTENANCE = 'MAINTENANCE', 'Maintenance'


class VariableType(models.TextChoices):
    # --- Datos diarios de sueño ---
    SLEEP = 'SLEEP', 'Sueño'
    SLEEP_DURATION = 'SLEEP_DURATION', 'Duración total del sueño'
    SLEEP_LIGHT = 'SLEEP_LIGHT', 'Minutos en sueño ligero'
    SLEEP_DEEP = 'SLEEP_DEEP', 'Minutos en sueño profundo'
    SLEEP_REM = 'SLEEP_REM', 'Minutos en sueño REM'
    SLEEP_AWAKE = 'SLEEP_AWAKE', 'Tiempo despierto durante el periodo de sueño'
    SLEEP_START_END = 'SLEEP_START_END', 'Hora de inicio y finalización del sueño'

    # --- Variables fisiológicas diarias ---
    HEART_RATE = 'HEART_RATE', 'Frecuencia cardíaca'
    HEART_RATE_RESTING = 'HEART_RATE_RESTING', 'Frecuencia cardíaca en reposo'
    HRV_NOCTURNAL = 'HRV_NOCTURNAL', 'Variabilidad de la frecuencia cardíaca nocturna'
    RESPIRATORY_RATE_NOCTURNAL = 'RESPIRATORY_RATE_NOCTURNAL', 'Frecuencia respiratoria nocturna'

    # --- Actividad y zonas de frecuencia cardíaca ---
    HR_ZONE_FAT_BURN = 'HR_ZONE_FAT_BURN', 'Minutos en zona de quema de grasa'
    HR_ZONE_CARDIO = 'HR_ZONE_CARDIO', 'Minutos en zona cardio'
    HR_ZONE_PEAK = 'HR_ZONE_PEAK', 'Minutos en zona pico'
    ACTIVE_ZONE_MINUTES = 'ACTIVE_ZONE_MINUTES', 'Minutos activos (Active Zone Minutes)'
    STEPS = 'STEPS', 'Pasos'
    DISTANCE = 'DISTANCE', 'Distancia'


class AlertPriority(models.TextChoices):
    HIGH = 'HIGH', 'Alta'
    MEDIUM = 'MEDIUM', 'Media'


class AlertType(models.TextChoices):
    SYNC_ERROR = 'SYNC_ERROR', 'Error de sincronización'
    NO_DATA_24H = 'NO_DATA_24H', 'Sin datos >24 horas'
    DEVICE_OFF = 'DEVICE_OFF', 'Pulsera apagada'
    LOW_BATTERY = 'LOW_BATTERY', 'Batería <20%'
    TOKEN_EXPIRED = 'TOKEN_EXPIRED', 'Token caducado'
    DEVICE_UNLINKED = 'DEVICE_UNLINKED', 'Dispositivo desvinculado'
    NO_RECORDS = 'NO_RECORDS', 'Participante sin registros'
    HRV_UNAVAILABLE = 'HRV_UNAVAILABLE', 'HRV no disponible'
    INSUFFICIENT_SLEEP = 'INSUFFICIENT_SLEEP', 'Sueño insuficiente'
    INSUFFICIENT_USAGE = 'INSUFFICIENT_USAGE', 'Tiempo de uso insuficiente'


ALERT_CATALOG = {
    AlertType.SYNC_ERROR: {
        'message': 'No ha sido posible sincronizar los datos del participante. Revise la conexión e inténtelo de nuevo.',
        'priority': AlertPriority.HIGH,
    },
    AlertType.NO_DATA_24H: {
        'message': 'No se han recibido datos del participante en las últimas 24 horas. Compruebe que la pulsera está siendo utilizada y sincronizada correctamente.',
        'priority': AlertPriority.HIGH,
    },
    AlertType.DEVICE_OFF: {
        'message': 'La pulsera parece estar apagada o sin actividad. Solicite al participante que la encienda y sincronice con la aplicación Fitbit.',
        'priority': AlertPriority.HIGH,
    },
    AlertType.LOW_BATTERY: {
        'message': 'La batería de la pulsera es inferior al 20%. Se recomienda recargar el dispositivo para evitar pérdidas de datos.',
        'priority': AlertPriority.MEDIUM,
    },
    AlertType.TOKEN_EXPIRED: {
        'message': 'No se puede acceder a los datos del participante. Es necesario volver a autorizar la conexión con Google Health.',
        'priority': AlertPriority.HIGH,
    },
    AlertType.DEVICE_UNLINKED: {
        'message': 'La pulsera ya no está vinculada a la cuenta del participante. Compruebe la configuración de Fitbit y Google Health.',
        'priority': AlertPriority.HIGH,
    },
    AlertType.NO_RECORDS: {
        'message': 'No existen datos registrados para este participante. Compruebe que el proceso de vinculación se ha completado correctamente.',
        'priority': AlertPriority.HIGH,
    },
    AlertType.HRV_UNAVAILABLE: {
        'message': 'No se ha podido obtener la variabilidad de la frecuencia cardíaca (HRV) para este día. Esto puede deberse a un tiempo de uso insuficiente durante el sueño o a una calidad de señal inadecuada.',
        'priority': AlertPriority.MEDIUM,
    },
    AlertType.INSUFFICIENT_SLEEP: {
        'message': 'Se ha registrado un tiempo de sueño insuficiente para obtener todas las métricas fisiológicas.',
        'priority': AlertPriority.MEDIUM,
    },
    AlertType.INSUFFICIENT_USAGE: {
        'message': 'La pulsera ha sido utilizada menos de 18 horas durante el día. Algunas variables fisiológicas pueden estar incompletas.',
        'priority': AlertPriority.MEDIUM,
    },
}


# ==========================================
# ENTIDADES
# ==========================================

class Participant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participant_code = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.participant_code


class Fitbit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fitbit_code = models.CharField(max_length=100, unique=True)
    status = models.CharField(
        max_length=20,
        choices=FitbitStatus.choices,
        default=FitbitStatus.FREE
    )

    @property
    def operational_status(self):
        if self.status in (FitbitStatus.MAINTENANCE, FitbitStatus.INACTIVE):
            return self.status

        now = timezone.now()

        active = self.assignments.filter(
            start_date__lte=now
        ).filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gte=now)
        ).exists()

        return FitbitStatus.IN_USE if active else FitbitStatus.FREE

    def __str__(self):
        return f"Fitbit {self.fitbit_code}"


class GoogleAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participant = models.OneToOneField(Participant, on_delete=models.CASCADE, related_name='google_account')
    email = models.EmailField(unique=True)
    access_token = models.TextField()
    refresh_token = models.TextField()
    access_token_expiration = models.DateTimeField()
    authentication_status = models.CharField(max_length=50)

    def __str__(self):
        return self.email


class Assignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participant = models.ForeignKey(Participant, on_delete=models.CASCADE, related_name='assignments')
    fitbit = models.ForeignKey(Fitbit, on_delete=models.CASCADE, related_name='assignments')
    start_date = models.DateTimeField()
    estimated_end_date = models.DateTimeField(blank=True, null=True)  
    real_end_date = models.DateTimeField(blank=True, null=True)       

    @property
    def status(self):
        now = timezone.now()
        if self.start_date > now:
            return AssignmentStatus.PENDING
        if self.estimated_end_date and self.estimated_end_date < now:
            return AssignmentStatus.COMPLETED
        return AssignmentStatus.ACTIVE

    def clean(self):
        if self.estimated_end_date and self.estimated_end_date <= self.start_date:
            raise ValidationError("Estimated end date must be later than start date.")
        super().clean()
        if not self.start_date:
            return

        overlapping = Assignment.objects.filter(fitbit=self.fitbit)
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)

        for existing in overlapping:
            ex_start = existing.start_date

            if not ex_end:
                raise ValidationError(f"La pulsera {self.fitbit.fitbit_code} ya está asignada de forma indefinida.")

            new_end = self.estimated_end_date if self.estimated_end_date else timezone.now() + timezone.timedelta(days=3650)

            if self.start_date <= ex_end and new_end >= ex_start:
                raise ValidationError(
                    f"Conflicto de fechas: La pulsera {self.fitbit.fitbit_code} ya está asignada a "
                    f"{existing.participant.participant_code} del {ex_start.strftime('%d/%m/%Y')} al {ex_end.strftime('%d/%m/%Y')}."
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Assignment: {self.participant.participant_code} -> {self.fitbit.fitbit_code} ({self.status})"


class SyncLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    google_account = models.ForeignKey(GoogleAccount, on_delete=models.CASCADE, related_name='sync_logs')
    sync_date = models.DateTimeField(auto_now_add=True)
    result = models.CharField(max_length=100)
    downloaded_records = models.IntegerField(default=0)

    def __str__(self):
        return f"Sync {self.sync_date} - {self.result}"


class PhysiologicalData(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='physiological_data')
    variable_type = models.CharField(max_length=100, choices=VariableType.choices)
    physical_time = models.DateTimeField()
    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)
    metric_value = models.FloatField()
    device_name = models.CharField(max_length=100, blank=True, null=True)
    platform = models.CharField(max_length=100, blank=True, null=True)
    recording_method = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.variable_type}: {self.metric_value} at {self.physical_time}"


class Alert(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(
        Assignment, on_delete=models.CASCADE, related_name='alerts',
        null=True, blank=True,
    )
    google_account = models.ForeignKey(
        GoogleAccount, on_delete=models.CASCADE, related_name='alerts',
        null=True, blank=True,
    )
    alert_type = models.CharField(max_length=50, choices=AlertType.choices)
    priority = models.CharField(max_length=20, choices=AlertPriority.choices, blank=True)
    message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.message or not self.priority:
            catalog_entry = ALERT_CATALOG[self.alert_type]
            self.message = self.message or catalog_entry['message']
            self.priority = self.priority or catalog_entry['priority']
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.priority}] {self.get_alert_type_display()}"


def trigger_alert(alert_type, google_account=None, assignment=None):
    """Genera una alerta automática si no hay una previa sin resolver del mismo tipo."""
    filters = {'alert_type': alert_type, 'resolved': False}
    if assignment:
        filters['assignment'] = assignment
    elif google_account:
        filters['google_account'] = google_account
    else:
        return

    # Si ya existe una alerta activa de este tipo, no la duplicamos
    if Alert.objects.filter(**filters).exists():
        return

    # Si no existe, la creamos y se autocompletará con el catálogo
    Alert.objects.create(
        alert_type=alert_type,
        google_account=google_account,
        assignment=assignment
    )

# ==========================================
# SEÑALES PARA ACTUALIZAR FITBIT
# ==========================================

@receiver(pre_save, sender=Assignment)
def capture_previous_fitbit(sender, instance, **kwargs):
    if instance.pk:
        try:
            previous = Assignment.objects.get(pk=instance.pk)
            if previous.fitbit_id != instance.fitbit_id:
                instance._previous_fitbit_id = previous.fitbit_id
        except Assignment.DoesNotExist:
            pass


@receiver(post_save, sender=Assignment)
def update_fitbit_status(sender, instance, **kwargs):
    if instance.fitbit:
        real_status = instance.fitbit.operational_status
        if instance.fitbit.status != real_status:
            instance.fitbit.status = real_status
            instance.fitbit.save()

    previous_fitbit_id = getattr(instance, '_previous_fitbit_id', None)
    if previous_fitbit_id:
        try:
            previous_fitbit = Fitbit.objects.get(pk=previous_fitbit_id)
            real_status = previous_fitbit.operational_status
            if previous_fitbit.status != real_status:
                previous_fitbit.status = real_status
                previous_fitbit.save()
        except Fitbit.DoesNotExist:
            pass


@receiver(post_delete, sender=Assignment)
def update_fitbit_status_on_delete(sender, instance, **kwargs):
    if instance.fitbit_id:
        try:
            fitbit = Fitbit.objects.get(pk=instance.fitbit_id)
            real_status = fitbit.operational_status
            if fitbit.status != real_status:
                fitbit.status = real_status
                fitbit.save()
        except Fitbit.DoesNotExist:
            pass


@receiver(pre_delete, sender=Participant)
def capture_fitbits_before_delete(sender, instance, **kwargs):
    fitbit_ids = list(
        instance.assignments.values_list('fitbit_id', flat=True).distinct()
    )
    instance._fitbits_to_recheck = fitbit_ids


@receiver(post_delete, sender=Participant)
def recheck_fitbits_after_delete(sender, instance, **kwargs):
    fitbit_ids = getattr(instance, '_fitbits_to_recheck', [])
    if not fitbit_ids:
        return

    for fitbit in Fitbit.objects.filter(id__in=fitbit_ids):
        real_status = fitbit.operational_status
        if fitbit.status != real_status:
            fitbit.status = real_status
            fitbit.save()


@receiver(post_save, sender=GoogleAccount)
def check_token_or_sync_error(sender, instance, created, **kwargs):
    """Si hay problemas de autenticación o estado crítico en la cuenta."""
    if instance.authentication_status and instance.authentication_status != 'ACTIVE':
        trigger_alert(AlertType.TOKEN_EXPIRED, google_account=instance)
    else:
        # Si vuelve a estar activa, resolvemos automáticamente la alerta de token
        Alert.objects.filter(google_account=instance, alert_type=AlertType.TOKEN_EXPIRED, resolved=False).update(
            resolved=True, resolved_at=timezone.now()
        )