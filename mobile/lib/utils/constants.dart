class ApiConstants {
  // Activez cette variable à true pour tester en local avec votre téléphone physique connecté au Wi-Fi de votre PC.
  // Passez à false pour connecter l'application mobile à votre serveur de production hébergé en ligne.
  static const bool useLocalServer = true;

  // IP locale de votre ordinateur (Wi-Fi actif : 192.168.8.101)
  static const String localBaseUrl = 'http://192.168.8.101:3001';
  
  // URL de production en ligne (ex: sur Render ou Railway)
  static const String productionBaseUrl = 'https://queuepay-backend.onrender.com';

  static const String baseUrl = useLocalServer ? localBaseUrl : productionBaseUrl;
  static const String apiPrefix = '/api/v1';
  static const String apiUrl = '$baseUrl$apiPrefix';
}
