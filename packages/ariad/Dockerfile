# -----------------------------------------------------------------------------
# ARIA Desktop - Optimized VNC Environment
# -----------------------------------------------------------------------------
FROM ubuntu:22.04

# -----------------------------------------------------------------------------
# Environment & Build Args
# -----------------------------------------------------------------------------
ARG DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:0 \
    HOME=/home/user \
    SHELL=/bin/bash \
    LANG=en_US.UTF-8 \
    LC_ALL=C

# -----------------------------------------------------------------------------
# System Base (Single Layer)
# -----------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Core X11/VNC stack
    xvfb x11vnc xauth x11-xserver-utils \
    # Minimal XFCE (no bloat)
    xfce4-session xfce4-panel xfwm4 xfdesktop4 \
    thunar mousepad xfce4-terminal \
    # Icon themes (for proper icon display)
    adwaita-icon-theme-full gnome-icon-theme hicolor-icon-theme \
    gtk-update-icon-cache librsvg2-common \
    # System essentials
    dbus dbus-x11 wmctrl sudo ca-certificates \
    # Development tools
    python3 python3-pip curl wget git \
    # Process management
    supervisor netcat-openbsd \
    # Minimal utilities (calculator, image viewer, archive manager)
    galculator ristretto file-roller \
    # Build dependencies (needed later)
    cmake build-essential \
    libx11-dev libxtst-dev libxinerama-dev libxi-dev \
    libxt-dev libxrandr-dev libxkbcommon-dev libxkbcommon-x11-dev \
    xclip \
    # Explicitly remove bloat
    && apt-get remove -y --purge \
        light-locker xfce4-screensaver xfce4-power-manager \
        xfce4-notifyd xfce4-pulseaudio-plugin \
        parole xfburn gigolo \
        || true \
    # Aggressive cleanup
    && apt-get autoremove -y --purge \
    && apt-get clean \
    && rm -rf \
        /var/lib/apt/lists/* \
        /usr/share/doc/* \
        /usr/share/man/* \
        /usr/share/locale/* \
        /tmp/* \
        /var/tmp/* \
    # Setup dbus
    && mkdir -p /run/dbus /var/run/dbus \
    && dbus-uuidgen > /etc/machine-id

# -----------------------------------------------------------------------------
# Firefox & Node.js (Single Layer)
# -----------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    software-properties-common apt-transport-https gnupg \
    libgl1-mesa-dri libgl1-mesa-glx libcap2-bin \
    fontconfig fonts-dejavu-core \
    && add-apt-repository -y ppa:mozillateam/ppa \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get update \
    && apt-get install -y --no-install-recommends firefox-esr nodejs \
    # Set Firefox as default browser
    && update-alternatives --install /usr/bin/x-www-browser x-www-browser /usr/bin/firefox-esr 200 \
    && update-alternatives --set x-www-browser /usr/bin/firefox-esr \
    && fc-cache -f -v \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/* /tmp/*

# Upgrade pip
RUN pip3 install --no-cache-dir --upgrade pip

# -----------------------------------------------------------------------------
# VNC & noVNC (Optimized)
# -----------------------------------------------------------------------------
RUN git clone --depth 1 https://github.com/novnc/noVNC.git /opt/noVNC \
    && git clone --depth 1 https://github.com/novnc/websockify.git /opt/websockify \
    && cd /opt/websockify \
    && pip3 install --no-cache-dir --break-system-packages . \
    && rm -rf /opt/noVNC/.git /opt/websockify/.git

# -----------------------------------------------------------------------------
# ARIA Application Build
# -----------------------------------------------------------------------------
# Copy source files (context is packages/, so we need ariad/ prefix)
COPY ./shared/ /aria/shared/
COPY ./ariad/ /aria/ariad/

# Build ariad
WORKDIR /aria/ariad
RUN npm install \
    && npm rebuild uiohook-napi \
    && npm run build \
    && npm prune --production \
    && npm cache clean --force \
    && rm -rf /root/.npm /tmp/*

# Build libnut-core (optimized)
WORKDIR /compile
RUN git clone --depth 1 https://github.com/ZachJW34/libnut-core.git \
    && cd libnut-core \
    && npm ci \
    && npm run build:release \
    && cp build/Release/libnut.node /aria/ariad/node_modules/@nut-tree-fork/libnut-linux/build/Release/libnut.node \
    # Cleanup build artifacts
    && cd / \
    && rm -rf /compile /tmp/* /var/tmp/* \
    && apt-get remove -y --purge cmake build-essential git \
    && apt-get autoremove -y --purge \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /aria/ariad

# -----------------------------------------------------------------------------
# User Setup & System Configuration
# -----------------------------------------------------------------------------
# Create user with sudo access
RUN useradd -m -s /bin/bash user \
    && echo "user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && mkdir -p /tmp/aria-screenshots \
    && chown -R user:user /tmp/aria-screenshots

# Copy system configuration files
RUN chown -R root:root /aria/ariad/root \
    && find /aria/ariad/root -type f -exec chmod 644 {} + \
    && find /aria/ariad/root -type d -exec chmod 755 {} + \
    && find /aria/ariad/root -type f -executable -exec chmod +x {} + \
    && cp -a /aria/ariad/root/. /

# Copy custom ARIA wallpaper (from build context packages/)
COPY ariad/ARIA-BG.png /usr/share/backgrounds/aria-bg.png

# Setup user home directory with wallpaper autostart
RUN mkdir -p /home/user/Desktop && \
    mkdir -p /home/user/.config/autostart && \
    mkdir -p /home/user/.local/share && \
    mkdir -p /home/user/.cache && \
    # Copy all application shortcuts to desktop
    cp -f /usr/share/applications/firefox.desktop /home/user/Desktop/ 2>/dev/null || true && \
    cp -f /usr/share/applications/firefox-esr.desktop /home/user/Desktop/ 2>/dev/null || true && \
    cp -f /usr/share/applications/xfce4-terminal.desktop /home/user/Desktop/ 2>/dev/null || true && \
    cp -f /usr/share/applications/mousepad.desktop /home/user/Desktop/ 2>/dev/null || true && \
    cp -f /usr/share/applications/Thunar.desktop /home/user/Desktop/ 2>/dev/null || true && \
    cp -f /usr/share/applications/thunar.desktop /home/user/Desktop/ 2>/dev/null || true && \
    cp -f /usr/share/applications/galculator.desktop /home/user/Desktop/ 2>/dev/null || true && \
    cp -f /usr/share/applications/ristretto.desktop /home/user/Desktop/ 2>/dev/null || true && \
    cp -f /usr/share/applications/org.gnome.FileRoller.desktop /home/user/Desktop/ 2>/dev/null || true && \
    cp -f /usr/share/applications/file-roller.desktop /home/user/Desktop/ 2>/dev/null || true && \
    # Mark all desktop files as trusted/executable
    chmod +x /home/user/Desktop/*.desktop 2>/dev/null || true && \
    # Fix icon theme cache
    gtk-update-icon-cache -f /usr/share/icons/hicolor/ 2>/dev/null || true && \
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
    chown -R user:user /home/user && \
    chmod -R 755 /home/user

WORKDIR /home/user

# -----------------------------------------------------------------------------
# Runtime Configuration
# -----------------------------------------------------------------------------
EXPOSE 9990

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]