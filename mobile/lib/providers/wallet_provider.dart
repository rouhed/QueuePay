import 'package:flutter/material.dart';
import 'package:mobile/services/api_service.dart';

class WalletProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  num _balance = 0;
  List<dynamic> _transactions = [];

  bool get isLoading => _isLoading;
  num get balance => _balance;
  List<dynamic> get transactions => _transactions;

  Future<void> fetchWallet() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.client.get('/wallet');
      if (response.statusCode == 200 && response.data['data'] != null) {
        _balance = response.data['data']['balance'] ?? 0;
      }
      
      final txResponse = await _apiService.client.get('/wallet/transactions');
      if (txResponse.statusCode == 200 && txResponse.data['data'] != null) {
        _transactions = txResponse.data['data']['data'] ?? [];
      }
    } catch (e) {
      print('Error fetching wallet: $e');
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> deposit(num amount, String paymentMethod) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _apiService.client.post('/wallet/deposit', data: {
        'amount': amount,
        'paymentMethod': paymentMethod, // 'mvola' | 'orange_money'
      });

      if (response.statusCode == 201 || response.statusCode == 200) {
        // Refresh wallet
        await fetchWallet();
        return true;
      }
    } catch (e) {
      print('Error depositing: $e');
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }
}
