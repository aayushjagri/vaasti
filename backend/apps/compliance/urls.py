from rest_framework.routers import DefaultRouter
from .views import PoliceRegistrationViewSet

router = DefaultRouter()
router.register(r'', PoliceRegistrationViewSet, basename='compliance')

urlpatterns = router.urls
