"""
Vasati — Rate limiting for OTP requests.
Max 3 per phone per 10 minutes (uses Redis counter).
"""
from rest_framework.throttling import SimpleRateThrottle


class OTPRateThrottle(SimpleRateThrottle):
    """Rate limit OTP requests: max 3 per phone per 10 minutes."""
    scope = 'otp'
    rate = '3/10m'

    def get_cache_key(self, request, view):
        phone = request.data.get('phone', '')
        email = request.data.get('email', '')
        ident = phone or email
        if not ident:
            return None
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }

    def parse_rate(self, rate):
        """Parse custom rate format like '3/10m'."""
        if rate is None:
            return (None, None)
        num, period = rate.split('/')
        num_requests = int(num)
        # Parse period: e.g. "10m" → 600 seconds
        if period.endswith('m'):
            duration = int(period[:-1]) * 60
        elif period.endswith('h'):
            duration = int(period[:-1]) * 3600
        elif period.endswith('s'):
            duration = int(period[:-1])
        else:
            duration = {'s': 1, 'm': 60, 'h': 3600, 'd': 86400}[period]
        return (num_requests, duration)
