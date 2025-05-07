from rest_framework import serializers
from .models import Destination, Continent

class ContinentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Continent
        fields = ['id', 'name', 'slug']
        read_only_fields = ['id']

class DestinationSerializer(serializers.ModelSerializer):
    continent = ContinentSerializer(read_only=True)
    
    class Meta:
        model = Destination
        fields = ['id', 'name', 'slug', 'description', 'country', 'city', 'continent', 'image', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at'] 