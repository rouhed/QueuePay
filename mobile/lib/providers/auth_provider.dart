import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;

  Future<void> checkAuthStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('access_token');
    
    if (token != null) {
      // Validate token or get user profile
      try {
        final response = await _apiService.client.get('/users/profile');
        if (response.statusCode == 200) {
          _user = response.data['data'];
          _isAuthenticated = true;
        } else {
          await logout();
        }
      } catch (e) {
        await logout();
      }
    } else {
      _isAuthenticated = false;
    }
    notifyListeners();
  }

  Future<bool> login(String login, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.client.post('/auth/login', data: {
        'login': login,
        'password': password,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        final token = response.data['data']['accessToken'];
        final user = response.data['data']['user'];
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', token);
        
        _user = user;
        _isAuthenticated = true;
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<bool> register(String firstName, String lastName, String phone, String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.client.post('/auth/register', data: {
        'firstName': firstName,
        'lastName': lastName,
        'phone': phone,
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Automatically login or navigate to OTP
        final token = response.data['data']['accessToken'];
        final user = response.data['data']['user'];
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('access_token', token);
        
        _user = user;
        _isAuthenticated = true;
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    _user = null;
    _isAuthenticated = false;
    notifyListeners();
  }
}
