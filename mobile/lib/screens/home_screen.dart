import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/providers/queue_provider.dart';
import 'package:mobile/widgets/glass_container.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final queueProvider = Provider.of<QueueProvider>(context, listen: false);
      queueProvider.fetchEntities();
      queueProvider.fetchCurrentTicket();
    });
  }

  void _showReserveDialog(BuildContext context, dynamic entity, dynamic queue) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => GlassContainer(
        padding: const EdgeInsets.all(24),
        borderRadius: 30,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 5,
                decoration: const BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.all(Radius.circular(10)),
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Confirmer la réservation',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Voulez-vous réserver un ticket pour le service ${entity['name']} ?',
              style: const TextStyle(color: Colors.white70),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () async {
                final success = await Provider.of<QueueProvider>(context, listen: false).reserveTicket(queue['id']);
                if (!context.mounted) return;
                Navigator.pop(context);
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Réservation confirmée avec succès !'),
                      backgroundColor: Color(0xFF00B894),
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Erreur lors de la réservation.'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              },
              child: const Text('Oui, Réserver'),
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Annuler', style: TextStyle(color: Colors.white54)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final queueProvider = Provider.of<QueueProvider>(context);
    final user = authProvider.user;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Row(
          children: [
            Image.asset('assets/logo.png', width: 30, height: 30),
            const SizedBox(width: 12),
            const Text('QueuePay', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Bienvenue,',
              style: TextStyle(fontSize: 16, color: Colors.white70),
            ),
            Text(
              '${user?['firstName'] ?? 'Client'} 👋',
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 30),
            // Wallet Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6C5CE7), Color(0xFF00B894)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF6C5CE7).withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  )
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Solde disponible', style: TextStyle(color: Colors.white, fontSize: 14)),
                  const SizedBox(height: 8),
                  const Text('0 Ar', style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      _buildWalletButton(Icons.add, 'Dépôt'),
                      const SizedBox(width: 16),
                      _buildWalletButton(Icons.history, 'Historique'),
                    ],
                  )
                ],
              ),
            ),
            const SizedBox(height: 40),
            if (queueProvider.currentTicket != null) ...[
              const Text(
                'Votre ticket en cours',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              GlassContainer(
                padding: const EdgeInsets.all(20),
                borderRadius: 16,
                borderColor: const Color(0xFF00B894).withOpacity(0.5),
                child: Column(
                  children: [
                    Text(
                      'Ticket N°${queueProvider.currentTicket!['ticketNumber']}',
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF00B894)),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'Position dans la file : ${queueProvider.currentTicket!['position'] ?? '?'}',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: () {
                          // Navigate to tickets tab
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white.withOpacity(0.1),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          side: const BorderSide(color: Colors.white24),
                        ),
                        child: const Text('Voir le QR Code'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),
            ],
            const Text(
              'Services autour de vous',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            if (queueProvider.isLoading && queueProvider.entities.isEmpty)
              const Center(child: CircularProgressIndicator())
            else if (queueProvider.entities.isEmpty)
              const Center(child: Text('Aucun service disponible', style: TextStyle(color: Colors.white54)))
            else
              ...queueProvider.entities.map((entity) {
                // Determine the primary queue for simplicity
                final queues = entity['queues'] as List?;
                final primaryQueue = (queues != null && queues.isNotEmpty) ? queues.first : null;

                return Padding(
                  padding: const EdgeInsets.only(bottom: 16.0),
                  child: GlassContainer(
                    padding: const EdgeInsets.all(16),
                    borderRadius: 16,
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                color: Colors.white10,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.account_balance, size: 30, color: Color(0xFF6C5CE7)),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(entity['name'] ?? 'Entité', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 4),
                                  Text(primaryQueue != null ? 'Capacité: ${primaryQueue['maxCapacity'] ?? 'N/A'}' : 'Pas de file', style: const TextStyle(color: Colors.orangeAccent)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        if (primaryQueue != null && queueProvider.currentTicket == null) ...[
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: () => _showReserveDialog(context, entity, primaryQueue),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF6C5CE7),
                              ),
                              child: const Text('RÉSERVER UN TICKET', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ]
                      ],
                    ),
                  ),
                );
              }).toList(),
          ],
        ),
      ),
    );
  }

  Widget _buildWalletButton(IconData icon, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Colors.black26,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
