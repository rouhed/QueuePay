import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:mobile/providers/queue_provider.dart';

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
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF13132B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isActive ? const Color(0xFF6C5CE7) : Colors.white10),
        boxShadow: isActive
            ? [
                BoxShadow(
                  color: const Color(0xFF6C5CE7).withValues(alpha: 0.2),
                  blurRadius: 10,
                  spreadRadius: 2,
                )
              ]
            : null,
      ),
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
                      ? const Color(0xFF00B894).withValues(alpha: 0.2)
                      : (status == 'Terminé' ? Colors.grey.withValues(alpha: 0.2) : Colors.red.withValues(alpha: 0.2)),
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
                    Text(ticketNumber, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const Text('Position', style: TextStyle(color: Colors.white54, fontSize: 12)),
                    Text(position, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
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
            const SizedBox(height: 20),
            const LinearProgressIndicator(
              value: 0.6,
              backgroundColor: Colors.white10,
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6C5CE7)),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  if (ticketId != null) {
                    _showQrDialog(context, ticketId);
                  }
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white38),
                ),
                child: const Text('VOIR LE QR CODE'),
              ),
            ),
          ],
        ],
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
