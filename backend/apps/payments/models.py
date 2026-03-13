"""
Vasati — Payment Models
Tenant-schema scoped. Tracks rent payments, reminders, receipts.
All money is DecimalField in NPR — no floats.
"""
from django.db import models


class RentPayment(models.Model):
    METHODS = [
        ('esewa', 'eSewa'),
        ('khalti', 'Khalti'),
        ('bank_transfer', 'Bank Transfer'),
        ('cash', 'Cash'),
    ]
    STATUS = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    lease = models.ForeignKey('tenancies.Lease', on_delete=models.PROTECT, related_name='payments')

    # Amount
    amount_npr = models.DecimalField(max_digits=10, decimal_places=2)

    # Period — what month this payment covers (BS)
    period_month_bs = models.CharField(max_length=7)   # "2081-04" (Baisakh 2081)
    period_month_ad = models.DateField()               # First day of the AD month

    # Payment info
    method = models.CharField(max_length=20, choices=METHODS)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    transaction_ref = models.CharField(max_length=200, blank=True)  # Gateway ref or manual note
    paid_at_bs = models.CharField(max_length=10, blank=True)
    paid_at_ad = models.DateTimeField(null=True, blank=True)

    # Who logged it
    logged_by_user_id = models.IntegerField()

    # Receipt
    receipt_number = models.CharField(max_length=50, unique=True)  # Auto-generated: VAS-2081-04-0001
    receipt_document = models.CharField(max_length=500, blank=True)  # MinIO key

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.receipt_number} — NPR {self.amount_npr}"


class PaymentReminder(models.Model):
    """Log of all reminders sent."""
    lease = models.ForeignKey('tenancies.Lease', on_delete=models.CASCADE)
    reminder_type = models.CharField(
        max_length=30,
        choices=[
            ('due_7_days', '7 days before due'),
            ('due_today', 'Due today'),
            ('overdue_3', '3 days overdue'),
            ('overdue_7', '7 days overdue'),
            ('manual', 'Manual'),
        ]
    )
    channel = models.CharField(max_length=10, choices=[('sms', 'SMS'), ('app', 'In-app')])
    sent_at = models.DateTimeField(auto_now_add=True)
    delivered = models.BooleanField(default=False)
    message_preview = models.TextField(blank=True)

    def __str__(self):
        return f"Reminder ({self.reminder_type}) for lease {self.lease_id}"
