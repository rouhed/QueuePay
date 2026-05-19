import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile/utils/constants.dart';

class ApiService {
  late Dio _dio;

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.apiUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        // Handle global errors here like 401 Unauthorized for token refresh
        return handler.next(e);
      },
    ));
  }

  Dio get client => _dio;
}
