from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Destination, Continent
from .serializers import DestinationSerializer, ContinentSerializer
from django.db.models import Count

# Create your views here.

class ContinentListView(generics.ListAPIView):
    queryset = Continent.objects.all()
    serializer_class = ContinentSerializer
    permission_classes = [permissions.AllowAny]

class ContinentDetailView(generics.RetrieveAPIView):
    queryset = Continent.objects.all()
    serializer_class = ContinentSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]

class DestinationsByContinent(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        continents = Continent.objects.all()
        result = []
        
        for continent in continents:
            destinations = Destination.objects.filter(continent=continent)
            continent_data = {
                'id': continent.id,
                'name': continent.name,
                'slug': continent.slug,
                'destinations': DestinationSerializer(destinations, many=True).data
            }
            result.append(continent_data)
        
        return Response(result)

class DestinationListView(generics.ListAPIView):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    permission_classes = [permissions.AllowAny]

class DestinationDetailView(generics.RetrieveAPIView):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]

class DestinationCreateView(generics.CreateAPIView):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    permission_classes = [permissions.IsAdminUser]

class DestinationUpdateView(generics.UpdateAPIView):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.IsAdminUser]

class DestinationDeleteView(generics.DestroyAPIView):
    queryset = Destination.objects.all()
    serializer_class = DestinationSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.IsAdminUser]
