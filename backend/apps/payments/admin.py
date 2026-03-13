from django.contrib import admin
from .models import RentPayment, PaymentReminder


@admin.register(RentPayment)
class RentPaymentAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'lease', 'amount_npr', 'method', 'status', 'period_month_bs')
    list_filter = ('status', 'method')
    search_fields = ('receipt_number', 'transaction_ref')


@admin.register(PaymentReminder)
class PaymentReminderAdmin(admin.ModelAdmin):
    list_display = ('lease', 'reminder_type', 'channel', 'sent_at', 'delivered')
    list_filter = ('reminder_type', 'channel', 'delivered')
