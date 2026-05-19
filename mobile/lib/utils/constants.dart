class ApiConstants {
  // For Android Emulator, use 10.0.2.2. For physical device or iOS, use actual IP.
  // We'll use 10.0.2.2 by default as it's common for local dev.
  static const String baseUrl = 'http://10.0.2.2:3001';
  static const String apiPrefix = '/api/v1';
  static const String apiUrl = '$baseUrl$apiPrefix';
}
