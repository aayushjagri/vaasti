from django.contrib import admin
from .models import Notice


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ('subject', 'notice_type', 'audience_type', 'sent_at')
    list_filter = ('notice_type', 'audience_type')
    search_fields = ('subject',)
