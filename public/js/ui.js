document.addEventListener('DOMContentLoaded', () => {
            
            // ==========================================
            // Chat Interface Toggling (Preserved from original)
            // ==========================================
            const chatHeader = document.getElementById('chatHeader');
            const chatInterface = document.getElementById('chatInterface');
            const icon = document.getElementById('toggleChat').querySelector('i');
            
            chatHeader.addEventListener('click', (e) => {
                if(e.target.closest('#chatInput') || e.target.closest('#chatBody')) return;
                
                chatInterface.classList.toggle('active');
                if (chatInterface.classList.contains('active')) {
                    chatInterface.style.transform = 'translateY(0)';
                    icon.classList.remove('fa-chevron-up');
                    icon.classList.add('fa-chevron-down');
                } else {
                    chatInterface.style.transform = 'translateY(calc(100% - 70px))';
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-up');
                }
            });
            chatInterface.style.transform = 'translateY(calc(100% - 70px))'; // Init hidden

            // ==========================================
            // Context-Aware Info Panels (CSP Safe Implementation)
            // ==========================================
            document.querySelectorAll('.info-toggle').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault(); // Stop page jumps
                    
                    const container = this.closest('.glass-panel');
                    const panel = container.querySelector('.info-panel');
                    const isActive = panel.classList.contains('active');
                    
                    // Auto-close other active panels for a cleaner UI
                    document.querySelectorAll('.info-panel.active').forEach(p => {
                        if(p !== panel) {
                            p.classList.remove('active');
                            const toggleBtn = p.closest('.glass-panel').querySelector('.info-toggle.active');
                            if (toggleBtn) toggleBtn.classList.remove('active');
                        }
                    });

                    // Toggle current panel
                    if (!isActive) {
                        panel.classList.add('active');
                        this.classList.add('active');
                    } else {
                        panel.classList.remove('active');
                        this.classList.remove('active');
                    }
                });
            });


        });
