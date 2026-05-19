import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/screens/splash_screen.dart';
import 'package:mobile/theme/app_theme.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/providers/queue_provider.dart';
import 'package:mobile/providers/wallet_provider.dart';
import 'package:mobile/services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService().init();
  runApp(const QueuePayApp());
}

class QueuePayApp extends StatelessWidget {
  const QueuePayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => QueueProvider()),
        ChangeNotifierProvider(create: (_) => WalletProvider()),
      ],
      child: MaterialApp(
        title: 'QueuePay',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const SplashScreen(),
      ),
    );
  }
}
