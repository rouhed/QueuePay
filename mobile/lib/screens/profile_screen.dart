import 'package:flutter/material.dart';
import 'package:mobile/screens/login_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return const LogoutDialog();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon Profil'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            onPressed: () => _showLogoutDialog(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            const CircleAvatar(
              radius: 50,
              backgroundColor: Color(0xFF6C5CE7),
              child: Icon(Icons.person, size: 50, color: Colors.white),
            ),
            const SizedBox(height: 16),
            const Text(
              'Client Enregistré',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              '+261 34 00 000 00',
              style: TextStyle(color: Colors.white54, fontSize: 16),
            ),
            const SizedBox(height: 32),
            _buildProfileOption(Icons.person_outline, 'Informations personnelles'),
            _buildProfileOption(Icons.notifications_none, 'Notifications'),
            _buildProfileOption(Icons.security, 'Sécurité et mot de passe'),
            _buildProfileOption(Icons.language, 'Langue (Français)'),
            _buildProfileOption(Icons.help_outline, 'Aide et support'),
            _buildProfileOption(Icons.info_outline, 'À propos de QueuePay'),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileOption(IconData icon, String title) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF13132B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFF6C5CE7)),
        title: Text(title, style: const TextStyle(color: Colors.white)),
        trailing: const Icon(Icons.chevron_right, color: Colors.white54),
        onTap: () {},
      ),
    );
  }
}

class LogoutDialog extends StatefulWidget {
  const LogoutDialog({super.key});

  @override
  State<LogoutDialog> createState() => _LogoutDialogState();
}

class _LogoutDialogState extends State<LogoutDialog> {
  bool _isLoggingOut = false;

  void _startLogout() async {
    setState(() {
      _isLoggingOut = true;
    });
    
    // Simulate API call and clear session
    await Future.delayed(const Duration(seconds: 2));
    
    if (!mounted) return;
    
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
      (Route<dynamic> route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF13132B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.exit_to_app, size: 48, color: Colors.white70),
            const SizedBox(height: 16),
            const Text(
              'Déconnexion',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Êtes-vous sûr de vouloir vous déconnecter de votre compte ?',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 24),
            if (_isLoggingOut) ...[
              const CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6C5CE7)),
              ),
              const SizedBox(height: 16),
              const Text('Déconnexion en cours...', style: TextStyle(color: Colors.white54)),
            ] else ...[
              Row(
                children: [
                  Expanded(
                    child: TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Annuler', style: TextStyle(color: Colors.white70)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _startLogout,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.redAccent,
                      ),
                      child: const Text('Quitter'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
