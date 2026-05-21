import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import '../providers/queue_provider.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  dynamic _selectedEntity;
  String _searchQuery = '';
  
  LatLng? _userLocation;

  // Centre par défaut: Antananarivo, Madagascar
  final LatLng _defaultCenter = const LatLng(-18.8792, 47.5079);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<QueueProvider>(context, listen: false).fetchEntities();
      _getCurrentLocation();
    });
  }

  Future<void> _getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    if (permission == LocationPermission.deniedForever) return;

    Position position = await Geolocator.getCurrentPosition();
    setState(() {
      _userLocation = LatLng(position.latitude, position.longitude);
    });
    
    _mapController.move(_userLocation!, 14.0);
  }

  List<Marker> _buildMarkers(List<dynamic> entities) {
    final markers = <Marker>[];
    for (int i = 0; i < entities.length; i++) {
      final entity = entities[i];
      // Utiliser les coordonnées si disponibles, sinon positions simulées autour d'Antananarivo
      final double lat = (entity['latitude'] as num?)?.toDouble() 
          ?? _defaultCenter.latitude + (i * 0.004) - 0.01;
      final double lng = (entity['longitude'] as num?)?.toDouble() 
          ?? _defaultCenter.longitude + (i * 0.006) - 0.01;

      markers.add(
        Marker(
          point: LatLng(lat, lng),
          width: 50,
          height: 50,
          child: GestureDetector(
            onTap: () {
              setState(() => _selectedEntity = entity);
            },
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: _selectedEntity?['id'] == entity['id']
                    ? const Color(0xFF00B894)
                    : const Color(0xFF6C5CE7),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: (_selectedEntity?['id'] == entity['id']
                            ? const Color(0xFF00B894)
                            : const Color(0xFF6C5CE7))
                        .withValues(alpha: 0.5),
                    blurRadius: 10,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: const Icon(
                Icons.location_on,
                color: Colors.white,
                size: 22,
              ),
            ),
          ),
        ),
      );
    }
    return markers;
  }

  @override
  Widget build(BuildContext context) {
    final queueProvider = Provider.of<QueueProvider>(context);
    final entities = queueProvider.entities.where((e) {
      if (_searchQuery.isEmpty) return true;
      final name = (e['name'] ?? '').toString().toLowerCase();
      final address = (e['address'] ?? '').toString().toLowerCase();
      return name.contains(_searchQuery.toLowerCase()) || 
             address.contains(_searchQuery.toLowerCase());
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF0F0F13),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E1E2D),
        title: const Text(
          'Carte des Établissements',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
        elevation: 0,
      ),
      body: queueProvider.isLoading && queueProvider.entities.isEmpty
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF6C5CE7)),
            )
          : Stack(
              children: [
                // ── Carte ──────────────────────────────────
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _userLocation ?? _defaultCenter,
                    initialZoom: 13.0,
                    onTap: (_, __) {
                      setState(() => _selectedEntity = null);
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.queuepay.mobile',
                    ),
                    MarkerLayer(markers: [
                      ..._buildMarkers(entities),
                      if (_userLocation != null)
                        Marker(
                          point: _userLocation!,
                          width: 40,
                          height: 40,
                          child: const Icon(
                            Icons.my_location,
                            color: Colors.blueAccent,
                            size: 30,
                          ),
                        ),
                    ]),
                  ],
                ),

                // ── Barre de recherche ─────────────────────
                Positioned(
                  top: 16,
                  left: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E1E2D).withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.3),
                          blurRadius: 15,
                          offset: const Offset(0, 5),
                        ),
                      ],
                    ),
                    child: TextField(
                      style: const TextStyle(color: Colors.white),
                      onChanged: (v) => setState(() => _searchQuery = v),
                      decoration: InputDecoration(
                        hintText: 'Rechercher un établissement...',
                        hintStyle: TextStyle(
                          color: Colors.white.withValues(alpha: 0.4),
                        ),
                        border: InputBorder.none,
                        icon: Icon(
                          Icons.search,
                          color: Colors.white.withValues(alpha: 0.4),
                        ),
                      ),
                    ),
                  ),
                ),

                // ── Fiche de l'entité sélectionnée ─────────
                if (_selectedEntity != null)
                  Positioned(
                    bottom: 30,
                    left: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E1E2D).withValues(alpha: 0.95),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.1),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.4),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF6C5CE7), Color(0xFF00B894)],
                                  ),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: const Icon(Icons.business, color: Colors.white, size: 24),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _selectedEntity['name'] ?? 'Entité',
                                      style: const TextStyle(
                                        color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _selectedEntity['address'] ?? 'Adresse non spécifiée',
                                      style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 13),
                                    ),
                                  ],
                                ),
                              ),
                              GestureDetector(
                                onTap: () => setState(() => _selectedEntity = null),
                                child: Icon(Icons.close, color: Colors.white.withValues(alpha: 0.5), size: 20),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              _infoChip(
                                Icons.access_time,
                                _selectedEntity['isOpen'] == true ? 'Ouvert' : 'Fermé',
                                _selectedEntity['isOpen'] == true ? const Color(0xFF00B894) : Colors.red,
                              ),
                              const SizedBox(width: 10),
                              _infoChip(
                                Icons.people_outline,
                                '${(_selectedEntity['queues'] as List?)?.length ?? 0} files',
                                const Color(0xFF6C5CE7),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: () {
                                // Retourne à l'accueil avec l'entité sélectionnée
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Sélectionné: ${_selectedEntity['name']}'),
                                    backgroundColor: const Color(0xFF00B894),
                                  ),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF6C5CE7),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                elevation: 5,
                              ),
                              child: const Text(
                                'Prendre un Ticket',
                                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                // ── Bouton recentrer ───────────────────────
                Positioned(
                  bottom: _selectedEntity != null ? 230 : 30,
                  right: 16,
                  child: FloatingActionButton.small(
                    backgroundColor: const Color(0xFF1E1E2D),
                    onPressed: () {
                      if (_userLocation != null) {
                        _mapController.move(_userLocation!, 14.0);
                      } else {
                        _mapController.move(_defaultCenter, 13.0);
                        _getCurrentLocation(); // Réessayer de trouver la position
                      }
                    },
                    child: const Icon(Icons.my_location, color: Color(0xFF6C5CE7)),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _infoChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
