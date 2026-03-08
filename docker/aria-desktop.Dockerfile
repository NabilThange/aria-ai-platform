# Extend the pre-built aria-desktop image
FROM ghcr.io/aria-ai/aria-desktop:edge

# Copy custom wallpaper
COPY packages/aria-ui/public/ARIA-BG.png /usr/share/backgrounds/aria-bg.png

# Create wallpaper setup script that runs at XFCE startup
RUN mkdir -p /home/user/.config/autostart && \
    echo '#!/bin/bash' > /home/user/.config/set-wallpaper.sh && \
    echo 'sleep 3' >> /home/user/.config/set-wallpaper.sh && \
    echo 'DISPLAY=:0 xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitorscreen/workspace0/last-image -s /usr/share/backgrounds/aria-bg.png' >> /home/user/.config/set-wallpaper.sh && \
    echo 'DISPLAY=:0 xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitorscreen/workspace0/image-style -s 5' >> /home/user/.config/set-wallpaper.sh && \
    chmod +x /home/user/.config/set-wallpaper.sh && \
    echo '[Desktop Entry]' > /home/user/.config/autostart/set-wallpaper.desktop && \
    echo 'Type=Application' >> /home/user/.config/autostart/set-wallpaper.desktop && \
    echo 'Name=Set Wallpaper' >> /home/user/.config/autostart/set-wallpaper.desktop && \
    echo 'Exec=/home/user/.config/set-wallpaper.sh' >> /home/user/.config/autostart/set-wallpaper.desktop && \
    echo 'Hidden=false' >> /home/user/.config/autostart/set-wallpaper.desktop && \
    echo 'NoDisplay=false' >> /home/user/.config/autostart/set-wallpaper.desktop && \
    echo 'X-GNOME-Autostart-enabled=true' >> /home/user/.config/autostart/set-wallpaper.desktop && \
    chown -R user:user /home/user/.config

# Expose the ariad service port
EXPOSE 9990

# Start the ariad service
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]
