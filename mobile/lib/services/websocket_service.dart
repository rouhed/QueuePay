import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/utils/constants.dart';

class WebSocketService {
  io.Socket? _socket;

  // Singleton pattern
  static final WebSocketService _instance = WebSocketService._internal();
  factory WebSocketService() => _instance;
  WebSocketService._internal();

  Future<void> connect() async {
    if (_socket != null && _socket!.connected) return;

    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');

    // Assumes backend socket uses root url or specific namespace
    _socket = io.io(ApiConstants.baseUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'extraHeaders': {
        'Authorization': token != null ? 'Bearer $token' : '',
      }
    });

    _socket!.connect();

    _socket!.onConnect((_) {
      print('WebSocket Connected');
    });

    _socket!.onDisconnect((_) {
      print('WebSocket Disconnected');
    });

    _socket!.onConnectError((data) {
      print('WebSocket Connection Error: $data');
    });
  }

  void joinQueue(String queueId) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join:queue', {'queueId': queueId});
    }
  }

  void leaveQueue(String queueId) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('leave:queue', {'queueId': queueId});
    }
  }

  void onQueueUpdate(Function(dynamic) callback) {
    if (_socket != null) {
      _socket!.on('queue:updated', (data) => callback(data));
    }
  }

  void joinTicket(String ticketId) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join:ticket', {'ticketId': ticketId});
    }
  }

  void leaveTicket(String ticketId) {
    if (_socket != null && _socket!.connected) {
      _socket!.emit('leave:ticket', {'ticketId': ticketId});
    }
  }

  void onYourTurn(Function(dynamic) callback) {
    if (_socket != null) {
      _socket!.on('ticket:your-turn', (data) => callback(data));
    }
  }

  void onTicketCalled(Function(dynamic) callback) {
    if (_socket != null) {
      _socket!.on('ticket:called', (data) => callback(data));
    }
  }

  void onTicketApproaching(Function(dynamic) callback) {
    if (_socket != null) {
      _socket!.on('ticket:approaching', (data) => callback(data));
    }
  }

  void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket = null;
    }
  }
}
