document.addEventListener('DOMContentLoaded', () => {
            
            // Chat Interface Toggling is handled modularly inside public/js/chat/ui.js

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
