import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:mobile/providers/queue_provider.dart';
import 'package:mobile/widgets/glass_container.dart';

class TicketsScreen extends StatelessWidget {
  const TicketsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final queueProvider = Provider.of<QueueProvider>(context);
    final currentTicket = queueProvider.currentTicket;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Mes Tickets'),
          backgroundColor: Colors.transparent,
          elevation: 0,
          bottom: const TabBar(
            indicatorColor: Color(0xFF6C5CE7),
            tabs: [
              Tab(text: 'Actifs'),
              Tab(text: 'Historique'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Active Tickets
            ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (currentTicket != null)
                  _buildTicketCard(
                    context,
                    serviceName: currentTicket['queue']?['entity']?['name'] ?? 'Service',
                    ticketNumber: currentTicket['ticketNumber'] ?? 'N/A',
                    position: '${currentTicket['position'] ?? '?'}ème',
                    waitTime: 'Calcul...',
                    isActive: true,
                    ticketId: currentTicket['id']?.toString(),
                  )
                else
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(40.0),
                      child: Text('Aucun ticket actif', style: TextStyle(color: Colors.white54)),
                    ),
                  ),
              ],
            ),
            // History
            ListView(
              padding: const EdgeInsets.all(20),
              children: [
                _buildTicketCard(
                  context,
                  serviceName: 'Hôpital HJRA',
                  ticketNumber: '112',
                  position: '-',
                  waitTime: '-',
                  isActive: false,
                  status: 'Terminé',
                ),
                _buildTicketCard(
                  context,
                  serviceName: 'Banque BOA',
                  ticketNumber: '089',
                  position: '-',
                  waitTime: '-',
                  isActive: false,
                  status: 'Annulé',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTicketCard(
    BuildContext context, {
    required String serviceName,
    required String ticketNumber,
    required String position,
    required String waitTime,
    required bool isActive,
    String? status,
    String? ticketId,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: GlassContainer(
        padding: const EdgeInsets.all(20),
        borderRadius: 20,
        borderColor: isActive ? const Color(0xFF6C5CE7).withOpacity(0.5) : Colors.white10,
        gradientColors: isActive 
            ? [
                const Color(0xFF6C5CE7).withOpacity(0.3),
                const Color(0xFF00B894).withOpacity(0.1),
              ]
            : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  serviceName,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  decoration: BoxDecoration(
                    color: isActive
                        ? const Color(0xFF00B894).withOpacity(0.2)
                        : (status == 'Terminé' ? Colors.grey.withOpacity(0.2) : Colors.red.withOpacity(0.2)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isActive ? 'En cours' : status!,
                    style: TextStyle(
                      color: isActive ? const Color(0xFF00B894) : (status == 'Terminé' ? Colors.grey : Colors.red),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Numéro', style: TextStyle(color: Colors.white54, fontSize: 12)),
                      Text(ticketNumber, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      const Text('Position', style: TextStyle(color: Colors.white54, fontSize: 12)),
                      Text(position, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('Attente', style: TextStyle(color: Colors.white54, fontSize: 12)),
                      Text(waitTime, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.orangeAccent)),
                    ],
                  ),
                ),
              ],
            ),
            if (isActive) ...[
              const SizedBox(height: 24),
              TweenAnimationBuilder<double>(
                tween: Tween<double>(begin: 0, end: 0.75), // 75% comme exemple visuel
                duration: const Duration(seconds: 3),
                curve: Curves.easeInOutCubic,
                builder: (context, value, _) => Column(
                  children: [
                    LinearProgressIndicator(
                      value: value,
                      minHeight: 6,
                      borderRadius: BorderRadius.circular(10),
                      backgroundColor: Colors.white10,
                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF00B894)),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Progression', style: TextStyle(color: Colors.white54, fontSize: 10)),
                        Text('${(value * 100).toInt()}%', style: const TextStyle(color: Color(0xFF00B894), fontSize: 10, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    if (ticketId != null) {
                      _showQrDialog(context, ticketId);
                    }
                  },
                  icon: const Icon(Icons.qr_code, color: Colors.white),
                  label: const Text('VOIR LE QR CODE', style: TextStyle(letterSpacing: 1.5, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6C5CE7).withOpacity(0.8),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 10,
                    shadowColor: const Color(0xFF6C5CE7).withOpacity(0.5),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showQrDialog(BuildContext context, String data) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF13132B),
        title: const Text('Votre QR Code', textAlign: TextAlign.center, style: TextStyle(color: Colors.white)),
        content: SizedBox(
          width: 250,
          height: 250,
          child: Center(
            child: Container(
              padding: const EdgeInsets.all(16),
              color: Colors.white,
              child: QrImageView(
                data: data,
                version: QrVersions.auto,
                size: 200.0,
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fermer', style: TextStyle(color: Color(0xFF6C5CE7))),
          ),
        ],
      ),
    );
  }
}
