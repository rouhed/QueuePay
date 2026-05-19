import 'package:flutter/material.dart';
import 'package:mobile/services/api_service.dart';
import 'package:mobile/services/websocket_service.dart';
import 'package:mobile/services/notification_service.dart';

class QueueProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final WebSocketService _webSocketService = WebSocketService();

  bool _isLoading = false;
  List<dynamic> _entities = [];
  Map<String, dynamic>? _currentTicket;
  
  bool get isLoading => _isLoading;
  List<dynamic> get entities => _entities;
  Map<String, dynamic>? get currentTicket => _currentTicket;

  QueueProvider() {
    // Initialize websocket when provider is created
    _webSocketService.connect();
    
    // Listen to updates
    _webSocketService.onQueueUpdate((data) {
      if (_currentTicket != null && data['queueId'] == _currentTicket!['queueId']) {
        final positions = data['positions'] as List?;
        if (positions != null) {
          final myPos = positions.firstWhere(
            (p) => p['ticketId'] == _currentTicket!['id'], 
            orElse: () => null
          );
          if (myPos != null) {
            _currentTicket!['position'] = myPos['position'];
            _currentTicket!['estimatedWaitMinutes'] = myPos['estimatedWaitMinutes'];
            notifyListeners();
          }
        }
      }
    });

    _webSocketService.onYourTurn((data) {
      if (_currentTicket != null && data['ticketId'] == _currentTicket!['id']) {
        _currentTicket!['status'] = 'CALLED';
        notifyListeners();
        
        NotificationService().showNotification(
          id: 2,
          title: 'A vous !',
          body: data['message'] ?? 'Veuillez vous diriger vers le guichet.',
        );
      }
    });

    _webSocketService.onTicketCalled((data) {
      if (_currentTicket != null && data['ticketId'] == _currentTicket!['id']) {
        _currentTicket!['status'] = 'CALLED';
        notifyListeners();
        
        NotificationService().showNotification(
          id: 2,
          title: 'C\'est votre tour !',
          body: 'Veuillez vous diriger vers le guichet ${data['counterNumber'] ?? ''}.',
        );
      }
    });

    _webSocketService.onTicketApproaching((data) {
      if (_currentTicket != null && data['ticketNumber'] == _currentTicket!['ticketNumber']) {
        NotificationService().showNotification(
          id: 1,
          title: 'Votre tour approche',
          body: data['message'] ?? 'Plus que quelques personnes avant vous.',
        );
      }
    });
  }

  Future<void> fetchEntities() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.client.get('/entities');
      if (response.statusCode == 200) {
        _entities = response.data['data'] ?? [];
      }
    } catch (e) {
      print('Error fetching entities: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> reserveTicket(String queueId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.client.post('/tickets/reserve', data: {
        'queueId': queueId,
      });

      if (response.statusCode == 201 || response.statusCode == 200) {
        _currentTicket = response.data['data'];
        
        // Join the socket room for this queue to receive updates
        _webSocketService.joinQueue(queueId);
        _webSocketService.joinTicket(_currentTicket!['id']);
        
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      print('Error reserving ticket: $e');
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> fetchCurrentTicket() async {
    try {
      final response = await _apiService.client.get('/tickets/current');
      if (response.statusCode == 200 && response.data['data'] != null) {
        _currentTicket = response.data['data'];
        if (_currentTicket != null) {
          _webSocketService.joinQueue(_currentTicket!['queueId']);
          _webSocketService.joinTicket(_currentTicket!['id']);
        }
        notifyListeners();
      }
    } catch (e) {
      print('Error fetching current ticket: $e');
    }
  }

  void leaveQueue() {
    if (_currentTicket != null) {
      _webSocketService.leaveQueue(_currentTicket!['queueId']);
      _webSocketService.leaveTicket(_currentTicket!['id']);
      _currentTicket = null;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _webSocketService.disconnect();
    super.dispose();
  }
}
