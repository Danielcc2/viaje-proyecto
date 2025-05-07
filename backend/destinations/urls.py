from django.urls import path
from .views import (
    DestinationListView,
    DestinationDetailView,
    DestinationCreateView,
    DestinationUpdateView,
    DestinationDeleteView,
    ContinentListView,
    ContinentDetailView,
    DestinationsByContinent
)

urlpatterns = [
    path('', DestinationListView.as_view(), name='destination-list'),
    path('create/', DestinationCreateView.as_view(), name='destination-create'),
    path('<slug:slug>/', DestinationDetailView.as_view(), name='destination-detail'),
    path('<slug:slug>/update/', DestinationUpdateView.as_view(), name='destination-update'),
    path('<slug:slug>/delete/', DestinationDeleteView.as_view(), name='destination-delete'),
    
    # Nuevas URLs para continentes
    path('continents/', ContinentListView.as_view(), name='continent-list'),
    path('continents/<slug:slug>/', ContinentDetailView.as_view(), name='continent-detail'),
    path('by-continent/', DestinationsByContinent.as_view(), name='destinations-by-continent'),
] 