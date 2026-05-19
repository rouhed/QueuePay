import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/screens/login_screen.dart';
import 'package:mobile/screens/main_screen.dart';
import 'package:mobile/providers/auth_provider.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigateToHome();
  }

  Future<void> _navigateToHome() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.checkAuthStatus();
    
    // Slight delay for splash effect
    await Future.delayed(const Duration(seconds: 2));
    
    if (!mounted) return;
    
    if (authProvider.isAuthenticated) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const MainScreen()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            colors: [Color(0xFF2A2A5A), Color(0xFF0B0B14)],
            radius: 1.5,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo Image
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF6C5CE7).withOpacity(0.3),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Image.asset(
                'assets/logo.png',
                width: 120,
                height: 120,
                fit: BoxFit.contain,
              ),
            ),
            const SizedBox(height: 24),
            // App Name
            const Text(
              'QueuePay',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Votre file d\'attente digitale',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white70,
              ),
            ),
            const SizedBox(height: 48),
            // Custom Progress Bar
            SizedBox(
              width: 200,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: const LinearProgressIndicator(
                  minHeight: 6,
                  backgroundColor: Color(0xFF13132B),
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00B894)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
