import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile/providers/wallet_provider.dart';
import 'package:intl/intl.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<WalletProvider>(context, listen: false).fetchWallet();
    });
  }

  void _showDepositDialog(BuildContext context, String method) {
    final amountController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF13132B),
        title: Text('Dépôt via $method', style: const TextStyle(color: Colors.white)),
        content: TextField(
          controller: amountController,
          keyboardType: TextInputType.number,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            hintText: 'Montant en Ar',
            hintStyle: TextStyle(color: Colors.white38),
            enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white54)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00B894)),
            onPressed: () async {
              final amount = num.tryParse(amountController.text);
              if (amount != null && amount > 0) {
                final success = await Provider.of<WalletProvider>(context, listen: false).deposit(
                  amount, 
                  method.toLowerCase().contains('orange') ? 'orange_money' : 'mvola'
                );
                if (!context.mounted) return;
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(success ? 'Dépôt réussi !' : 'Échec du dépôt.'),
                    backgroundColor: success ? const Color(0xFF00B894) : Colors.red,
                  ),
                );
              }
            },
            child: const Text('Valider'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final walletProvider = Provider.of<WalletProvider>(context);
    final balanceFormatter = NumberFormat('#,##0', 'fr_FR');
    return Scaffold(
      appBar: AppBar(
        title: const Text('Portefeuille'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF6C5CE7), Color(0xFF00B894)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  const Text('Solde actuel', style: TextStyle(color: Colors.white70, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text('${balanceFormatter.format(walletProvider.balance)} Ar', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildActionButton(Icons.add, 'Dépôt', Colors.white24, null),
                      _buildActionButton(Icons.history, 'Historique', Colors.white24, null),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              'Méthodes de paiement (Dépôt)',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: () => _showDepositDialog(context, 'MVola'),
              child: _buildPaymentMethodCard('MVola', 'assets/mvola_logo.png', const Color(0xFF00B894)),
            ),
            const SizedBox(height: 12),
            InkWell(
              onTap: () => _showDepositDialog(context, 'Orange Money'),
              child: _buildPaymentMethodCard('Orange Money', 'assets/orange_logo.png', Colors.orange),
            ),
            const SizedBox(height: 32),
            const Text(
              'Transactions récentes',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            if (walletProvider.isLoading && walletProvider.transactions.isEmpty)
              const Center(child: CircularProgressIndicator())
            else if (walletProvider.transactions.isEmpty)
              const Center(child: Text('Aucune transaction', style: TextStyle(color: Colors.white54)))
            else
              ...walletProvider.transactions.map((tx) {
                final isDeposit = tx['amount'] > 0;
                final dateStr = DateFormat('dd MMM yyyy, HH:mm').format(DateTime.parse(tx['createdAt']));
                return _buildTransactionItem(
                  tx['description'] ?? (isDeposit ? 'Dépôt' : 'Achat'),
                  '${isDeposit ? '+' : ''} ${balanceFormatter.format(tx['amount'])} Ar',
                  dateStr,
                  isDeposit ? Colors.green : Colors.red,
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton(IconData icon, String label, Color color, VoidCallback? onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildPaymentMethodCard(String name, String assetPath, Color borderColor) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF13132B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor.withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.white10,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.account_balance_wallet, color: Colors.white70), // Placeholder for logo
          ),
          const SizedBox(width: 16),
          Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const Spacer(),
          const Icon(Icons.chevron_right, color: Colors.white54),
        ],
      ),
    );
  }

  Widget _buildTransactionItem(String title, String amount, String date, Color amountColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF13132B),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              amountColor == Colors.green ? Icons.arrow_downward : Icons.arrow_upward,
              color: amountColor,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                Text(date, style: const TextStyle(color: Colors.white54, fontSize: 12)),
              ],
            ),
          ),
          Text(amount, style: TextStyle(color: amountColor, fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
