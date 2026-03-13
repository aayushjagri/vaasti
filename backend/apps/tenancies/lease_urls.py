from rest_framework.routers import DefaultRouter
from .views import LeaseViewSet

router = DefaultRouter()
router.register(r'', LeaseViewSet, basename='lease')

urlpatterns = router.urls
