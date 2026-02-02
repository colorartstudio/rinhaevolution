const translations = {
    'pt-BR': {
        // Login & Register
        'login-title': 'ENTRAR NA RINHA',
        'login-subtitle': 'Sua jornada épica começa aqui',
        'login-button': 'ENTRAR',
        'login-email-placeholder': 'E-mail',
        'login-password-placeholder': 'Senha',
        'login-no-account': 'Não tem conta?',
        'login-register-here': 'Cadastre-se aqui',
        'reg-title': 'NOVA CONTA',
        'reg-subtitle': 'Torne-se um mestre de galos',
        'reg-username-placeholder': 'Nome de Treinador',
        'reg-email-placeholder': 'Seu melhor e-mail',
        'reg-password-placeholder': 'Crie uma senha forte',
        'reg-button': 'CADASTRAR AGORA',
        'reg-already-account': 'Já tem conta?',
        'reg-login-now': 'Entrar agora',
        'login-lang-label': 'Idioma Preferido',
        
        // Navigation
        'nav-shop': 'Loja',
        'nav-inventory': 'Mochila',
        'nav-battle': 'Rinha',
        'nav-lab': 'Laboratório',
        'nav-more': 'Mais',
        'nav-logs': 'Logs',
        'nav-missions': 'Missões',
        'nav-tournament': 'Torneio',
        'nav-referral': 'Rede',
        'nav-leaderboard': 'Ranking',
        
        // Selection
        'sel-title': 'RINHA EVOLUTION',
        'sel-subtitle': 'Mobile Edition',
        'sel-wallet': 'Carteira Digital',
        'sel-lineage': '1. Linhagem',
        'sel-paint': '2. Pintura',
        'sel-bet': '3. Valor da Aposta (RC)',
        'sel-start': 'SELECIONAR GALO',
        'sel-search': 'PROCURAR OPONENTE',
        'sel-balance-error': 'Saldo insuficiente! Recarregue sua carteira.',
        'sel-challenge-friend': 'Desafiar Amigo',
        'sel-counter-info': 'Vermelho > Azul > Verde > Amarelo > Vermelho',
        'sel-preview-strength': 'FORÇA',
        'sel-preview-type': 'TIPO',
        'sel-team-preview': 'SEU TIME 3V3',
        'sel-team-ready': 'TIME PRONTO PARA A BATALHA!',
        'sel-team-incomplete': 'SELECIONE 3 GALOS NA MOCHILA',
        'sel-start-3v3': 'INICIAR RINHA 3V3',
        'sel-select-3': 'TIME INCOMPLETO',
        
        // Elements
        'el-fire': 'Fogo',
        'el-earth': 'Terra',
        'el-water': 'Água',
        'el-air': 'Ar',
        
        // Battle
        'btl-sorting': 'Sorteando Arena...',
        'btl-bonus': 'Bônus',
        'btl-vs': 'VS',
        'btl-actions': 'Ações de Combate',
        'btl-items': 'Itens',
        'btl-you': 'VOCÊ',
        'btl-opponent': 'OPONENTE',
        'btl-stunned': 'ATORDUADO!',
        'btl-critical': 'CRÍTICO!',
        'btl-weak': 'FRACO...',
        'btl-processing': 'PROCESSANDO...',
        'btl-float-heal': '🧪',
        'btl-float-energy': '⚡',
        'btl-float-burn': '🔥',
        'btl-error-login': 'Você precisa estar logado para iniciar uma batalha!',
        'btl-error-team': 'Você precisa de 3 galos no seu time!',
        'btl-error-server': 'Erro de conexão com o servidor. Verifique seu saldo e tente novamente.',
        
        // Arenas
        'arena-fire': 'Vulcânica',
        'arena-earth': 'Caverna',
        'arena-water': 'Lagoa',
        'arena-air': 'Pico Alto',
        
        // Result
        'res-victory': 'VITÓRIA!',
        'res-defeat': 'DERROTA',
        'res-draw': 'EMPATE!',
        'res-finance-title': 'Resultado Financeiro',
        'res-bet': 'Aposta',
        'res-prize': 'Prêmio',
        'res-profit': 'Lucro',
        'res-lost': 'Aposta perdida.',
        'res-refunded': 'Aposta devolvida.',
        'res-you': 'Você',
        'res-cpu': 'CPU',
        'res-play-again': 'Jogar Novamente',
        'res-base-label': 'Base',
        'res-bonus-label': 'Bônus',
        'res-paint-label': 'Pintura',
        'gen-level': 'Nivel',
        'gen-lvl-prefix': 'Niv',
        
        // Modals
        'mod-wallet-title': 'Carteira Digital',
        'mod-wallet-balance': 'Saldo Disponível',
        'mod-wallet-deposit': 'Depositar',
        'mod-wallet-withdraw': 'Sacar',
        'mod-wallet-network': 'Rede para Depósito',
        'mod-wallet-addr-label': 'Endereço',
        'mod-wallet-copy-btn': 'Copiar',
        'mod-wallet-sim-btn': 'Simular',
        'mod-wallet-withdraw-btn': 'Sacar',
        'mod-wallet-info': '<b>Conversão:</b> $1.00 USD = 100 RC. Crédito após 1 confirmação.',
        'mod-rank-title': 'Histórico',
        'mod-rank-matches': 'Jogos',
        'mod-rank-wins': 'Vitórias',
        'mod-rank-profit': 'Lucro Recente',
        'mod-settings-title': 'Configurações',
        'mod-settings-sound': 'Sons',
        'mod-settings-reset': 'Resetar Conta',
        'mod-settings-close': 'Fechar',
        'mod-settings-lang': 'Idioma',
        'mod-settings-logout': 'Logout',
        'mod-menu-title': 'Menu de Navegação',
        'mod-menu-missions': 'Missões',
        'mod-menu-tournament': 'Torneio',
        'mod-menu-referral': 'Rede',
        'mod-menu-ranking': 'Ranking',
        'mod-menu-logs': 'Logs',
        'mod-menu-close': 'Fechar',
        
        // System
        'sys-reset-confirm': 'Zerar tudo (saldo volta para 1000)?',
        'sys-deposit-success': 'Depósito de $5.00 USD confirmado! +500 RC adicionados.',
        'sys-withdraw-soon': 'Funcionalidade de Saque em breve!',
        'sys-no-history': 'Sem histórico.',
        'sys-loading': 'Carregando...',
        'sys-level-up': 'SUBIU DE NÍVEL! Seus galos ficaram mais fortes!',
        
        // Challenge
        'mod-share-title': 'DESAFIAR OPONENTE',
        'mod-share-subtitle': 'Envie este QR Code ou Link para um amigo',
        'mod-share-copy': 'Copiar Link',
        'mod-share-copied': 'Link Copiado!',
        'mod-share-challenge-received': 'DESAFIO RECEBIDO!',
        'mod-share-challenge-desc': 'Você foi desafiado por',
        'mod-share-accept': 'ACEITAR DESAFIO',
        'mod-share-ignore': 'IGNORAR',
        
        // Logs & Lab
        'logs-title': 'HISTÓRICO DE BATALHAS',
        'logs-subtitle': 'Revise seus combates e estratégias',
        'logs-empty': 'Nenhum log disponível',
        'logs-mode-1v1': 'Duelo 1v1',
        'logs-mode-3v3': 'Batalha de Equipes',
        'lab-title': 'LABORATÓRIO DE FUSÃO',
        'lab-subtitle': 'Combine DNA para criar galos lendários',
        'lab-parent-1': 'Pai 1',
        'lab-parent-2': 'Pai 2',
        'lab-cost-label': 'Custo da Fusão',
        'lab-button': 'FUSIONAR DNA',
        'lab-processing': 'FUSIONANDO DNA...',
        'lab-error-min': 'Você precisa de pelo menos 2 galos para fusionar!',
        'lab-error-available': 'Não há mais galos disponíveis para seleção!',
        'lab-error-select': 'Selecione dois galos primeiro!',
        'lab-error-failed': 'Falha na fusão: Saldo insuficiente ou erro técnico!',
        
        // Skins
        'skin-none': 'Original',
        'skin-neon': 'Neon',
        'skin-gold': 'Dourado',
        'skin-ghost': 'Espectral',
        'skin-ruby': 'Rubí',
        'skin-shadow': 'Sombrio',

        // Shop
        'shop-title': 'MERCADO',
        'shop-subtitle': 'Adquira novos galos e suprimentos',
        'shop-supplies': 'Suprimentos de Combate',
        'shop-new-roosters': 'Novos Galos',
        'shop-auction': 'Leilão em Destaque',
        'shop-buy-btn': 'Comprar',
        'shop-item-hp-name': 'Poção de HP',
        'shop-item-mp-name': 'Vitamina de Energia',
        'shop-item-hp-desc': 'Recupera HP',
        'shop-item-mp-desc': 'Recupera MP',
        'shop-error-balance': 'Saldo insuficiente',
        'shop-auction-loading': 'Buscando leilões reais...',
        'shop-auction-empty': 'Nenhum leilão ativo no momento.',
        'shop-auction-status': 'Status',
        'shop-auction-active': 'Ativo',
        'shop-success-buy': 'Galo adquirido com sucesso!',
        'shop-success-item': 'Item adquirido com sucesso!',
        'shop-success-rooster': 'Galo comprado com sucesso!',
        'shop-success-bid': 'Lance efetuado!',
        'shop-owned': 'Possui:',
        'shop-error-bid-low': 'Lance muito baixo',
        'shop-error-not-found': 'Galo não encontrado',
        'gen-level': 'Nível',
        'gen-lvl-prefix': 'Lvl',

        // Inventory
        'inv-title': 'MINHA MOCHILA',
        'inv-subtitle': 'Gerencie seu time de combate',
        'inv-empty': 'Sua mochila está vazia.<br>Visite a loja!',
        'inv-equip-btn': 'Equipar',
        'inv-remove-btn': 'REMOVER',
        'inv-no-items': 'SEM SUPRIMENTOS',
        'inv-use-btn': 'USAR',
        'inv-my-roosters': 'MEUS GALOS',
        'inv-hp-full': 'Este galo já está com a vida cheia!',
        'inv-no-rooster': 'Você não tem galos para usar este item!',
        'inv-used-msg': 'Usou',
        'inv-sell-btn': 'Vender',
        'inv-sell-prompt': 'Por quanto deseja vender este galo (RC)?',
        'inv-sell-success': 'Galo colocado à venda no leilão!',

        // Referral
        'ref-title': 'MINHA REDE',
        'ref-subtitle': 'Indique e ganhe em 5 níveis',
        'ref-link-label': 'Seu Link de Indicação',
        'ref-copy-btn': 'COPIAR',
        'ref-total-earnings-label': 'Total Ganho',
        'ref-my-code-label': 'Seu Código',
        'ref-stats-label': 'Estatísticas por Nível',
        'ref-users-suffix': 'usuários',
        'ref-level-label': '{n}º Nível ({p}%)',

        // Leaderboard
        'lead-title': 'RANKING GLOBAL',
        'lead-subtitle': 'Os melhores treinadores da rinha',
        'lead-pos': 'Pos',
        'lead-trainer': 'Treinador',
        'lead-balance': 'Saldo',
        'lead-loading': 'Carregando ranking...',
        'lead-no-players': 'Nenhum jogador encontrado.',
        'lead-wins-suffix': 'vitórias',
        'lead-error': 'Erro ao carregar ranking.',

        // Missions
        'miss-title': 'MISSÕES DIÁRIAS',
        'miss-subtitle': 'Complete tarefas para ganhar recompensas extras',
        'miss-reward-label': 'Prêmio:',
        'miss-m1-desc': 'Complete 5 batalhas',
        'miss-m2-desc': 'Vença 3 batalhas',
        'miss-m3-desc': 'Gaste 1000 RC no Mercado',

        // Tournament
        'tour-title': 'GRANDE TORNEIO',
        'tour-subtitle': 'Vença 3 lutas seguidas para o Jackpot',
        'tour-start-btn': 'Iniciar Torneio (500 RC)',
        'tour-no-active': 'Nenhum torneio ativo.<br>Pague a taxa para começar!',
        'tour-round-qf': 'QUARTAS',
        'tour-round-sf': 'SEMIFINAL',
        'tour-round-final': 'FINAL',
        'tour-waiting': 'Aguardando...',
        'tour-error-no-rooster': 'Selecione um galo para o torneio!',
        'tour-error-balance': 'Saldo insuficiente para entrar no torneio!',
        'tour-win-msg': '🏆 CAMPEÃO DO TORNEIO! Você ganhou o Jackpot de {jackpot} RC!',
        'tour-loss-msg': '☠️ ELIMINADO! Melhor sorte no próximo torneio.',
        'tour-cpu-names': ['Bico de Ouro', 'Pena de Ferro', 'Galo de Briga', 'Espora Afiada', 'Cresta Rubra', 'Trovão Azul', 'Relâmpago', 'Sombra Verde', 'Fogo Vivo', 'Pedra Bruta'],

        // Fusion Success
        'fus-radiant-birth': 'Nascimento Radiante',
        'fus-title': 'FUSÃO COMPLETA!',
        'fus-dna-label': 'DNA Code',
        'fus-atk-label': 'Ataque',
        'fus-hp-label': 'Vida Max',
        'fus-save-btn': 'GUARDAR NA MOCHILA',

        // Color Names
        'col-red-name': 'Rubro',
        'col-blue-name': 'Oceânico',
        'col-green-name': 'Silvestre',
        'col-yellow-name': 'Solar',

        // Auth Errors
        'auth-error-server-500': 'Erro de servidor (500). Verifique a configuração da Trigger no Supabase.',
        'auth-error-no-user': 'Falha ao obter dados do usuário após registro.',
        'auth-error-db': 'Erro no Banco de Dados: O Supabase falhou ao salvar o perfil.',
        'auth-error-reg-prefix': 'Erro ao cadastrar: ',
        'auth-error-email-unconfirmed': '⚠️ Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.',
        'auth-error-login-failed': 'Falha ao entrar.',
        'auth-error-invalid-credentials': 'Email ou senha incorretos.',
        'auth-fill-all': 'Preencha todos os campos!',

        // --- UI ELEMENTS (DYNAMIC) ---
    },
    'en': {
        // Login & Register
        'login-title': 'ENTER THE RINHA',
        'login-subtitle': 'Your epic journey starts here',
        'login-button': 'LOGIN',
        'login-email-placeholder': 'E-mail',
        'login-password-placeholder': 'Password',
        'login-no-account': "Don't have an account?",
        'login-register-here': 'Register here',
        'reg-title': 'NEW ACCOUNT',
        'reg-subtitle': 'Become a rooster master',
        'reg-username-placeholder': 'Trainer Name',
        'reg-email-placeholder': 'Your best e-mail',
        'reg-password-placeholder': 'Create a strong password',
        'reg-button': 'REGISTER NOW',
        'reg-already-account': 'Already have an account?',
        'reg-login-now': 'Login now',
        'login-lang-label': 'Preferred Language',
        
        // Navigation
        'nav-shop': 'Shop',
        'nav-inventory': 'Backpack',
        'nav-battle': 'Rinha',
        'nav-lab': 'Laboratory',
        'nav-more': 'More',
        'nav-logs': 'Logs',
        'nav-missions': 'Missions',
        'nav-tournament': 'Tournament',
        'nav-referral': 'Network',
        'nav-leaderboard': 'Ranking',
        
        // Selection
        'sel-title': 'RINHA EVOLUTION',
        'sel-subtitle': 'Mobile Edition',
        'sel-wallet': 'Digital Wallet',
        'sel-lineage': '1. Lineage',
        'sel-paint': '2. Painting',
        'sel-bet': '3. Bet Value (RC)',
        'sel-start': 'SELECT ROOSTER',
        'sel-search': 'FIND OPPONENT',
        'sel-balance-error': 'Insufficient balance! Recharge your wallet.',
        'sel-challenge-friend': 'Challenge Friend',
        'sel-counter-info': 'Red > Blue > Green > Yellow > Red',
        'sel-preview-strength': 'STRENGTH',
        'sel-preview-type': 'TYPE',
        'sel-team-preview': 'YOUR 3V3 TEAM',
        'sel-team-ready': 'TEAM READY FOR BATTLE!',
        'sel-team-incomplete': 'SELECT 3 ROOSTERS IN BACKPACK',
        'sel-start-3v3': 'START 3V3 BATTLE',
        'sel-select-3': 'INCOMPLETE TEAM',
        
        // Elements
        'el-fire': 'Fire',
        'el-earth': 'Earth',
        'el-water': 'Water',
        'el-air': 'Air',
        
        // Battle
        'btl-sorting': 'Sorting Arena...',
        'btl-bonus': 'Bonus',
        'btl-vs': 'VS',
        'btl-actions': 'Combat Actions',
        'btl-items': 'Items',
        'btl-you': 'YOU',
        'btl-opponent': 'OPPONENT',
        'btl-stunned': 'STUNNED!',
        'btl-critical': 'CRITICAL!',
        'btl-weak': 'WEAK...',
        'btl-processing': 'PROCESSING...',
        'btl-float-heal': '🧪',
        'btl-float-energy': '⚡',
        'btl-float-burn': '🔥',
        'btl-error-login': 'You need to be logged in to start a battle!',
        'btl-error-team': 'You need 3 roosters in your team!',
        'btl-error-server': 'Server connection error. Check your balance and try again.',
        
        // Arenas
        'arena-fire': 'Volcanic',
        'arena-earth': 'Cave',
        'arena-water': 'Lagoon',
        'arena-air': 'High Peak',
        
        // Result
        'res-victory': 'VICTORY!',
        'res-defeat': 'DEFEAT',
        'res-draw': 'DRAW!',
        'res-finance-title': 'Financial Result',
        'res-bet': 'Bet',
        'res-prize': 'Prize',
        'res-profit': 'Profit',
        'res-lost': 'Bet lost.',
        'res-refunded': 'Bet refunded.',
        'res-you': 'You',
        'res-cpu': 'CPU',
        'res-play-again': 'Play Again',
        'res-base-label': 'Base',
        'res-bonus-label': 'Bonus',
        'res-paint-label': 'Painting',
        
        // Modals
        'mod-wallet-title': 'Digital Wallet',
        'mod-wallet-balance': 'Available Balance',
        'mod-wallet-deposit': 'Deposit',
        'mod-wallet-withdraw': 'Withdraw',
        'mod-wallet-network': 'Deposit Network',
        'mod-wallet-addr-label': 'Address',
        'mod-wallet-copy-btn': 'Copy',
        'mod-wallet-sim-btn': 'Simulate',
        'mod-wallet-withdraw-btn': 'Withdraw',
        'mod-wallet-info': '<b>Conversion:</b> $1.00 USD = 100 RC. Credit after 1 confirmation.',
        'mod-rank-title': 'History',
        'mod-rank-matches': 'Games',
        'mod-rank-wins': 'Wins',
        'mod-rank-profit': 'Recent Profit',
        'mod-settings-title': 'Settings',
        'mod-settings-sound': 'Sounds',
        'mod-settings-reset': 'Reset Account',
        'mod-settings-close': 'Close',
        'mod-settings-lang': 'Language',
        'mod-settings-logout': 'Logout',
        'mod-menu-title': 'Navigation Menu',
        'mod-menu-missions': 'Missions',
        'mod-menu-tournament': 'Tournament',
        'mod-menu-referral': 'Network',
        'mod-menu-ranking': 'Ranking',
        'mod-menu-logs': 'Logs',
        'mod-menu-close': 'Close',
        
        // System
        'sys-reset-confirm': 'Reset everything (balance returns to 1000)?',
        'sys-deposit-success': '$5.00 USD deposit confirmed! +500 RC added.',
        'sys-withdraw-soon': 'Withdrawal feature coming soon!',
        'sys-no-history': 'No history.',
        'sys-loading': 'Loading...',
        'sys-level-up': 'LEVEL UP! Your roosters got stronger!',
        
        // Challenge
        'mod-share-title': 'CHALLENGE OPPONENT',
        'mod-share-subtitle': 'Send this QR Code or Link to a friend',
        'mod-share-copy': 'Copy Link',
        'mod-share-copied': 'Link Copied!',
        'mod-share-challenge-received': 'CHALLENGE RECEIVED!',
        'mod-share-challenge-desc': 'You were challenged by',
        'mod-share-accept': 'ACCEPT CHALLENGE',
        'mod-share-ignore': 'IGNORE',
        
        // Logs & Lab
        'logs-title': 'BATTLE HISTORY',
        'logs-subtitle': 'Review your combats and strategies',
        'logs-empty': 'No logs available',
        'logs-mode-1v1': '1v1 Duel',
        'logs-mode-3v3': 'Team Battle',
        'lab-title': 'FUSION LABORATORY',
        'lab-subtitle': 'Combine DNA to create legendary roosters',
        'lab-parent-1': 'Parent 1',
        'lab-parent-2': 'Parent 2',
        'lab-cost-label': 'Fusion Cost',
        'lab-button': 'FUSE DNA',
        'lab-processing': 'FUSING DNA...',
        'lab-error-min': 'You need at least 2 roosters to fuse!',
        'lab-error-available': 'No more roosters available for selection!',
        'lab-error-select': 'Select two roosters first!',
        'lab-error-failed': 'Fusion failed: Insufficient balance or technical error!',
        
        // Skins
        'skin-none': 'Original',
        'skin-neon': 'Neon',
        'skin-gold': 'Golden',
        'skin-ghost': 'Spectral',
        'skin-ruby': 'Ruby',
        'skin-shadow': 'Shadow',

        // Shop
        'shop-title': 'MARKETPLACE',
        'shop-subtitle': 'Get new roosters and supplies',
        'shop-supplies': 'Combat Supplies',
        'shop-new-roosters': 'New Roosters',
        'shop-auction': 'Featured Auction',
        'shop-buy-btn': 'Buy',
        'shop-item-hp-name': 'HP Potion',
        'shop-item-mp-name': 'Energy Vitamin',
        'shop-item-hp-desc': 'Restores HP',
        'shop-item-mp-desc': 'Restores MP',
        'shop-error-balance': 'Insufficient balance',
        'shop-auction-loading': 'Fetching real auctions...',
        'shop-auction-empty': 'No active auctions at the moment.',
        'shop-auction-status': 'Status',
        'shop-auction-active': 'Active',
        'shop-success-buy': 'Rooster purchased successfully!',
        'shop-success-item': 'Item purchased successfully!',
        'shop-success-rooster': 'Rooster purchased successfully!',
        'shop-success-bid': 'Bid placed successfully!',
        'shop-owned': 'Owned:',
        'shop-error-bid-low': 'Bid too low',
        'shop-error-not-found': 'Rooster not found',
        'gen-level': 'Level',
        'gen-lvl-prefix': 'Lvl',

        // Inventory
        'inv-title': 'MY BACKPACK',
        'inv-subtitle': 'Manage your combat team',
        'inv-empty': 'Your backpack is empty.<br>Visit the shop!',
        'inv-equip-btn': 'Equip',
        'inv-remove-btn': 'REMOVE',
        'inv-no-items': 'NO SUPPLIES',
        'inv-use-btn': 'USE',
        'inv-my-roosters': 'MY ROOSTERS',
        'inv-hp-full': 'This rooster is already at full health!',
        'inv-no-rooster': 'You have no roosters to use this item on!',
        'inv-used-msg': 'Used',
        'inv-sell-btn': 'Sell',
        'inv-sell-prompt': 'How much do you want to sell this rooster for (RC)?',
        'inv-sell-success': 'Rooster listed for sale in auction!',

        // Referral
        'ref-title': 'MY NETWORK',
        'ref-subtitle': 'Refer and earn in 5 levels',
        'ref-link-label': 'Your Referral Link',
        'ref-copy-btn': 'COPY',
        'ref-total-earnings-label': 'Total Earned',
        'ref-my-code-label': 'Your Code',
        'ref-stats-label': 'Stats per Level',
        'ref-users-suffix': 'users',
        'ref-level-label': '{n} Level ({p}%)',

        // Leaderboard
        'lead-title': 'GLOBAL RANKING',
        'lead-subtitle': 'The best trainers in the rinha',
        'lead-pos': 'Pos',
        'lead-trainer': 'Trainer',
        'lead-balance': 'Balance',
        'lead-loading': 'Loading ranking...',
        'lead-no-players': 'No players found.',
        'lead-wins-suffix': 'wins',
        'lead-error': 'Error loading ranking.',

        // Missions
        'miss-title': 'DAILY MISSIONS',
        'miss-subtitle': 'Complete tasks to earn extra rewards',
        'miss-reward-label': 'Reward:',
        'miss-m1-desc': 'Complete 5 battles',
        'miss-m2-desc': 'Win 3 battles',
        'miss-m3-desc': 'Spend 1000 RC in Marketplace',

        // Tournament
        'tour-title': 'GRAND TOURNAMENT',
        'tour-subtitle': 'Win 3 fights in a row for the Jackpot',
        'tour-start-btn': 'Start Tournament (500 RC)',
        'tour-no-active': 'No active tournament.<br>Pay the fee to start!',
        'tour-round-qf': 'QUARTER-FINAL',
        'tour-round-sf': 'SEMI-FINAL',
        'tour-round-final': 'FINAL',
        'tour-waiting': 'Waiting...',
        'tour-error-no-rooster': 'Select a rooster for the tournament!',
        'tour-error-balance': 'Insufficient balance to enter the tournament!',
        'tour-win-msg': '🏆 TOURNAMENT CHAMPION! You won the {jackpot} RC Jackpot!',
        'tour-loss-msg': '☠️ ELIMINATED! Better luck in the next tournament.',
        'tour-cpu-names': ['Golden Beak', 'Iron Feather', 'Fighting Cock', 'Sharp Spur', 'Crimson Crest', 'Blue Thunder', 'Lightning', 'Green Shadow', 'Living Fire', 'Rough Stone'],

        // Fusion Success
        'fus-radiant-birth': 'Radiant Birth',
        'fus-title': 'FUSION COMPLETE!',
        'fus-dna-label': 'DNA Code',
        'fus-atk-label': 'Attack',
        'fus-hp-label': 'Max HP',
        'fus-save-btn': 'SAVE IN BACKPACK',

        // Skills
        'skill-f1-name': 'Thermal Peck', 'skill-f1-desc': 'Basic fire damage.',
        'skill-f5-name': 'Solar Explosion', 'skill-f5-desc': 'High damage with burn chance.',
        'skill-f10-name': 'Rising Phoenix', 'skill-f10-desc': 'Massive damage and heals some HP.',
        'skill-w1-name': 'Water Jet', 'skill-w1-desc': 'Basic water damage.',
        'skill-w5-name': 'Bubble Shield', 'skill-w5-desc': 'Creates a shield reducing next damage.',
        'skill-w10-name': 'Tsunami', 'skill-w10-desc': 'Giant wave hitting with full force.',
        'skill-e1-name': 'Rock Smash', 'skill-e1-desc': 'Basic earth damage.',
        'skill-e5-name': 'Iron Armor', 'skill-e5-desc': 'Increases defense for 2 turns.',
        'skill-e10-name': 'Earthquake', 'skill-e10-desc': 'High damage with stun chance.',
        'skill-a1-name': 'Wind Cut', 'skill-a1-desc': 'Basic air damage.',
        'skill-a5-name': 'Swift Dodge', 'skill-a5-desc': 'Greatly increases dodge chance.',
        'skill-a10-name': 'Hurricane', 'skill-a10-desc': 'Ultra fast triple attack.',

        // Auth Errors
        'auth-error-server-500': 'Server error (500). Check Supabase Trigger configuration.',
        'auth-error-no-user': 'Failed to obtain user data after registration.',
        'auth-error-db': 'Database Error: Supabase failed to save profile.',
        'auth-error-reg-prefix': 'Registration error: ',
        'auth-error-email-unconfirmed': '⚠️ Your email has not been confirmed yet. Check your inbox.',
        'auth-error-login-failed': 'Failed to login.',
        'auth-error-invalid-credentials': 'Incorrect email or password.',
        'auth-fill-all': 'Fill in all fields!'
    },
    'es': {
        // Login & Register
        'login-title': 'ENTRAR EN LA RINHA',
        'login-subtitle': 'Tu viaje épico comienza aquí',
        'login-button': 'ENTRAR',
        'login-email-placeholder': 'Correo electrónico',
        'login-password-placeholder': 'Contraseña',
        'login-no-account': '¿No tienes una cuenta?',
        'login-register-here': 'Regístrate aquí',
        'reg-title': 'NUEVA CUENTA',
        'reg-subtitle': 'Conviértete en un maestro de gallos',
        'reg-username-placeholder': 'Nombre de Entrenador',
        'reg-email-placeholder': 'Tu mejor correo',
        'reg-password-placeholder': 'Crea una contraseña fuerte',
        'reg-button': 'REGISTRAR AHORA',
        'reg-already-account': '¿Ya tienes una cuenta?',
        'reg-login-now': 'Entrar ahora',
        'login-lang-label': 'Idioma Preferido',
        
        // Navigation
        'nav-shop': 'Tienda',
        'nav-inventory': 'Mochila',
        'nav-battle': 'Rinha',
        'nav-lab': 'Laboratorio',
        'nav-more': 'Más',
        'nav-logs': 'Logs',
        'nav-missions': 'Misiones',
        'nav-tournament': 'Torneo',
        'nav-referral': 'Red',
        'nav-leaderboard': 'Ranking',
        
        // Selection
        'sel-title': 'RINHA EVOLUTION',
        'sel-subtitle': 'Edición Móvil',
        'sel-wallet': 'Billetera Digital',
        'sel-lineage': '1. Linaje',
        'sel-paint': '2. Pintura',
        'sel-bet': '3. Valor de la Apuesta (RC)',
        'sel-start': 'SELECCIONAR GALLO',
        'sel-search': 'BUSCAR OPONENTE',
        'sel-balance-error': '¡Saldo insuficiente! Recarga tu billetera.',
        'sel-challenge-friend': 'Desafiar Amigo',
        'sel-counter-info': 'Rojo > Azul > Verde > Amarillo > Rojo',
        'sel-preview-strength': 'FUERZA',
        'sel-preview-type': 'TIPO',
        'sel-team-preview': 'TU EQUIPO 3V3',
        'sel-team-ready': '¡EQUIPO LISTO PARA LA BATALLA!',
        'sel-team-incomplete': 'SELECCIONA 3 GALLOS EN LA MOCHILA',
        'sel-start-3v3': 'INICIAR BATALLA 3V3',
        'sel-select-3': 'EQUIPO INCOMPLETO',
        
        // Elements
        'el-fire': 'Fuego',
        'el-earth': 'Tierra',
        'el-water': 'Agua',
        'el-air': 'Aire',
        
        // Battle
        'btl-sorting': 'Sorteando Arena...',
        'btl-bonus': 'Bono',
        'btl-vs': 'VS',
        'btl-actions': 'Acciones de Combate',
        'btl-items': 'Objetos',
        'btl-you': 'TÚ',
        'btl-opponent': 'OPONENTE',
        'btl-stunned': '¡ATURDIDO!',
        'btl-critical': '¡CRÍTICO!',
        'btl-weak': 'DÉBIL...',
        'btl-processing': 'PROCESANDO...',
        'btl-error-login': '¡Debes iniciar sesión para comenzar una batalla!',
        'btl-error-team': '¡Necesitas 3 gallos en tu equipo!',
        'btl-error-server': 'Error de conexión con el servidor. Verifica tu saldo e intenta de nuevo.',
        
        // Arenas
        'arena-fire': 'Volcánica',
        'arena-earth': 'Cueva',
        'arena-water': 'Laguna',
        'arena-air': 'Pico Alto',
        
        // Result
        'res-victory': '¡VICTORIA!',
        'res-defeat': 'DERROTA',
        'res-draw': '¡EMPATE!',
        'res-finance-title': 'Resultado Financiero',
        'res-bet': 'Apuesta',
        'res-prize': 'Premio',
        'res-profit': 'Ganancia',
        'res-lost': 'Apuesta perdida.',
        'res-refunded': 'Apuesta devuelta.',
        'res-you': 'Tú',
        'res-cpu': 'CPU',
        'res-play-again': 'Jugar de Nuevo',
        'res-base-label': 'Base',
        'res-bonus-label': 'Bono',
        'res-paint-label': 'Pintura',
        'gen-level': 'Nivel',
        'gen-lvl-prefix': 'Niv',
        
        // Modals
        'mod-wallet-title': 'Billetera Digital',
        'mod-wallet-balance': 'Saldo Disponible',
        'mod-wallet-deposit': 'Depositar',
        'mod-wallet-withdraw': 'Retirar',
        'mod-wallet-network': 'Red de Depósito',
        'mod-wallet-addr-label': 'Dirección',
        'mod-wallet-copy-btn': 'Copiar',
        'mod-wallet-sim-btn': 'Simular',
        'mod-wallet-withdraw-btn': 'Retirar',
        'mod-wallet-info': '<b>Conversión:</b> $1.00 USD = 100 RC. Crédito tras 1 confirmación.',
        'mod-rank-title': 'Historial',
        'mod-rank-matches': 'Juegos',
        'mod-rank-wins': 'Victorias',
        'mod-rank-profit': 'Ganancia Reciente',
        'mod-settings-title': 'Configuraciones',
        'mod-settings-sound': 'Sonidos',
        'mod-settings-reset': 'Reiniciar Cuenta',
        'mod-settings-close': 'Cerrar',
        'mod-settings-lang': 'Idioma',
        'mod-settings-logout': 'Cerrar sesión',
        'mod-menu-title': 'Menú de Navegación',
        'mod-menu-missions': 'Misiones',
        'mod-menu-tournament': 'Torneo',
        'mod-menu-referral': 'Red',
        'mod-menu-ranking': 'Ranking',
        'mod-menu-logs': 'Logs',
        'mod-menu-close': 'Cerrar',
        
        // System
        'sys-reset-confirm': '¿Reiniciar todo (el saldo vuelve a 1000)?',
        'sys-deposit-success': '¡Depósito de $5.00 USD confirmado! +500 RC añadidos.',
        'sys-withdraw-soon': '¡Funcionalidad de retiro próximamente!',
        'sys-no-history': 'Sin historial.',
        'sys-loading': 'Cargando...',
        'sys-level-up': '¡SUBIÓ DE NIVEL! ¡Tus gallos se han vuelto más fuertes!',
        
        // Challenge
        'mod-share-title': 'DESAFIAR OPONENTE',
        'mod-share-subtitle': 'Envía este código QR o enlace a un amigo',
        'mod-share-copy': 'Copiar enlace',
        'mod-share-copied': '¡Enlace copiado!',
        'mod-share-challenge-received': '¡DESAFÍO RECIBIDO!',
        'mod-share-challenge-desc': 'Fuiste desafiado por',
        'mod-share-accept': 'ACEPTAR DESAFÍO',
        'mod-share-ignore': 'IGNORAR',
        
        // Logs & Lab
        'logs-title': 'HISTORIAL DE BATALLAS',
        'logs-subtitle': 'Revisa tus combates y estrategias',
        'logs-empty': 'No hay logs disponibles',
        'logs-mode-1v1': 'Duelo 1v1',
        'logs-mode-3v3': 'Batalla de Equipos',
        'lab-title': 'LABORATORIO DE FUSIÓN',
        'lab-subtitle': 'Combina ADN para crear gallos legendarios',
        'lab-parent-1': 'Padre 1',
        'lab-parent-2': 'Padre 2',
        'lab-cost-label': 'Costo de Fusión',
        'lab-button': 'FUSIONAR ADN',
        'lab-processing': 'FUSIONANDO ADN...',
        'lab-error-min': '¡Necesitas al menos 2 gallos para fusionar!',
        'lab-error-available': '¡No hay más gallos disponibles para la selección!',
        'lab-error-select': '¡Selecciona dos gallos primero!',
        'lab-error-failed': '¡Fusión fallida: Saldo insuficiente o error técnico!',
        
        // Skins
        'skin-none': 'Original',
        'skin-neon': 'Neón',
        'skin-gold': 'Dorado',
        'skin-ghost': 'Espectral',
        'skin-ruby': 'Rubí',
        'skin-shadow': 'Sombrío',

        // Shop
        'shop-title': 'MERCADO',
        'shop-subtitle': 'Adquiere nuevos gallos y suministros',
        'shop-supplies': 'Suministros de Combate',
        'shop-new-roosters': 'Nuevos Gallos',
        'shop-auction': 'Subasta Destacada',
        'shop-buy-btn': 'Comprar',
        'shop-item-hp-name': 'Poción de HP',
        'shop-item-mp-name': 'Vitamina de Energía',
        'shop-item-hp-desc': 'Recupera HP',
        'shop-item-mp-desc': 'Recupera MP',
        'shop-error-balance': 'Saldo insuficiente',
        'shop-auction-loading': 'Buscando subastas reales...',
        'shop-auction-empty': 'No hay subastas activas en este momento.',
        'shop-auction-status': 'Estado',
        'shop-auction-active': 'Activo',
        'shop-success-buy': '¡Gallo adquirido con éxito!',
        'shop-success-item': '¡Objeto adquirido con éxito!',
        'shop-success-rooster': '¡Gallo comprado con éxito!',
        'shop-success-bid': '¡Puja realizada con éxito!',

        // Inventory
        'inv-title': 'MI MOCHILA',
        'inv-subtitle': 'Gestiona tu equipo de combate',
        'inv-empty': 'Tu mochila está vacía.<br>¡Visita la tienda!',
        'inv-equip-btn': 'Equipar',
        'inv-remove-btn': 'REMOVER',
        'inv-no-items': 'SIN SUMINISTROS',
        'inv-use-btn': 'USAR',
        'inv-my-roosters': 'MIS GALLOS',
        'inv-hp-full': '¡Este gallo ya tiene la vida llena!',
        'inv-no-rooster': '¡No tienes gallos para usar este objeto!',
        'inv-used-msg': 'Usó',
        'inv-sell-btn': 'Vender',
        'inv-sell-prompt': '¿Por cuánto quieres vender este gallo (RC)?',
        'inv-sell-success': '¡Gallo puesto a la venta en subasta!',

        // Referral
        'ref-title': 'MI RED',
        'ref-subtitle': 'Refiere y gana en 5 niveles',
        'ref-link-label': 'Tu enlace de referido',
        'ref-copy-btn': 'COPIAR',
        'ref-total-earnings-label': 'Total ganado',
        'ref-my-code-label': 'Tu código',
        'ref-stats-label': 'Estadísticas por nivel',
        'ref-users-suffix': 'usuarios',
        'ref-level-label': '{n}º Nivel ({p}%)',

        // Leaderboard
        'lead-title': 'RANKING GLOBAL',
        'lead-subtitle': 'Los mejores entrenadores de la rinha',
        'lead-pos': 'Pos',
        'lead-trainer': 'Entrenador',
        'lead-balance': 'Saldo',
        'lead-loading': 'Cargando ranking...',
        'lead-no-players': 'No se encontraron jugadores.',
        'lead-wins-suffix': 'victorias',
        'lead-error': 'Error al cargar el ranking.',

        // Missions
        'miss-title': 'MISIONES DIARIAS',
        'miss-subtitle': 'Completa tareas para ganar recompensas extra',
        'miss-reward-label': 'Premio:',
        'miss-m1-desc': 'Completa 5 batallas',
        'miss-m2-desc': 'Gana 3 batallas',
        'miss-m3-desc': 'Gasta 1000 RC en el Mercado',

        // Tournament
        'tour-title': 'GRAN TORNEO',
        'tour-subtitle': 'Gana 3 peleas seguidas para el Jackpot',
        'tour-start-btn': 'Iniciar Torneo (500 RC)',
        'tour-no-active': 'No hay torneo activo.<br>¡Paga la cuota para comenzar!',
        'tour-round-qf': 'CUARTOS',
        'tour-round-sf': 'SEMIFINAL',
        'tour-round-final': 'FINAL',
        'tour-waiting': 'Esperando...',
        'tour-error-no-rooster': '¡Selecciona un gallo para el torneo!',
        'tour-error-balance': '¡Saldo insuficiente para entrar al torneo!',
        'tour-win-msg': '🏆 ¡CAMPEÓN DEL TORNEIO! ¡Has ganado el Jackpot de {jackpot} RC!',
        'tour-loss-msg': '☠️ ¡ELIMINADO! Más suerte en el próximo torneo.',
        'tour-cpu-names': ['Pico de Oro', 'Pluma de Hierro', 'Gallo de Pelea', 'Espuela Afilada', 'Cresta Carmesí', 'Trueno Azul', 'Relámpago', 'Sombra Verde', 'Fuego Vivo', 'Piedra Bruta'],

        // Fusion Success
        'fus-radiant-birth': 'Nacimiento Radiante',
        'fus-title': '¡FUSIÓN COMPLETA!',
        'fus-dna-label': 'Código DNA',
        'fus-atk-label': 'Ataque',
        'fus-hp-label': 'Vida Máx',
        'fus-save-btn': 'GUARDAR EN MOCHILA',

        // Auth Errors
        'auth-error-server-500': 'Error de servidor (500). Verifica la configuración de la Trigger en Supabase.',
        'auth-error-no-user': 'Fallo al obtener datos del usuario tras el registro.',
        'auth-error-db': 'Error en la base de datos: Supabase falló al guardar el perfil.',
        'auth-error-reg-prefix': 'Error al registrarse: ',
        'auth-error-email-unconfirmed': '⚠️ Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.',
        'auth-error-login-failed': 'Fallo al entrar.',
        'auth-error-invalid-credentials': 'Correo o contraseña incorrectos.',
        'auth-fill-all': '¡Completa todos los campos!'
    }
};

export class I18n {
    constructor(defaultLang = 'pt-BR') {
        const stored = localStorage.getItem('rinha_lang');
        this.currentLang = (stored && translations[stored]) ? stored : defaultLang;
    }

    setLanguage(lang) {
        if (translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('rinha_lang', lang);
            this.updateUI();
        }
    }

    t(key, params = {}) {
        if (!translations[this.currentLang]) return key;
        let text = translations[this.currentLang][key] || key;
        
        // Dynamic params replacement
        Object.keys(params).forEach(p => {
            text = text.replace(`{${p}}`, params[p]);
        });
        
        return text;
    }

    updateUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (el.tagName === 'INPUT') {
                el.placeholder = translation;
            } else {
                // Preservar ícones se existirem (FontAwesome pattern)
                const icon = el.querySelector('i.fas, i.fab, i.far, i.fa-solid, i.fa-brand, i.fa-regular');
                if (icon) {
                    const iconHtml = icon.outerHTML;
                    el.innerHTML = `${iconHtml} ${translation}`;
                } else {
                    el.innerHTML = translation;
                }
            }
        });
    }
}

export default new I18n();
