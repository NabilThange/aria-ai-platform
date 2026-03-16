# =============================================================================
# STAGE 1: builder — compile ariad + libnut-core
# =============================================================================
FROM ubuntu:22.04 AS builder

ARG DEBIAN_FRONTEND=noninteractive

# Install only what's needed to build
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates git \
    cmake build-essential \
    libx11-dev libxtst-dev libxinerama-dev libxi-dev \
    libxt-dev libxrandr-dev libxkbcommon-dev libxkbcommon-x11-dev \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# --- ariad deps (cached unless package.json changes) ---
COPY ./shared/ /aria/shared/
COPY ./ariad/package.json ./ariad/package-lock.json* /aria/ariad/
WORKDIR /aria/ariad
RUN npm install

# --- ariad source + build ---
COPY ./ariad/ /aria/ariad/
RUN npm run build && npm prune --production && npm cache clean --force

# --- libnut-core native addon ---
RUN git clone --depth 1 --filter=blob:none https://github.com/ZachJW34/libnut-core.git /compile/libnut-core \
    && cd /compile/libnut-core \
    && npm ci \
    && npm run build:release \
    && cp build/Release/libnut.node /aria/ariad/node_modules/@nut-tree-fork/libnut-linux/build/Release/libnut.node \
    && rm -rf /compile

# =============================================================================
# STAGE 2: runtime — lean desktop environment
# =============================================================================
FROM ubuntu:22.04

ARG DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:0 \
    HOME=/home/user \
    SHELL=/bin/bash \
    LANG=en_US.UTF-8 \
    LC_ALL=C

# All system packages in one layer — build deps excluded
RUN apt-get update && apt-get install -y --no-install-recommends \
    # X11/VNC stack
    xvfb x11vnc xauth x11-xserver-utils \
    # Minimal XFCE
    xfce4-session xfce4-panel xfwm4 xfdesktop4 xfce4-terminal \
    thunar mousepad \
    # Icons & fonts
    adwaita-icon-theme-full hicolor-icon-theme \
    gtk-update-icon-cache librsvg2-common \
    fontconfig fonts-dejavu-core \
    # System
    dbus dbus-x11 wmctrl sudo ca-certificates \
    # Process management
    supervisor socat \
    # Python (for websockify)
    python3 python3-pip \
    # Runtime libs for native addons
    libx11-6 libxtst6 libxinerama1 libxi6 libxt6 libxrandr2 \
    libxkbcommon0 libxkbcommon-x11-0 \
    # GL/GPU stubs
    libgl1-mesa-dri libgl1-mesa-glx libcap2-bin \
    # VSCode deps
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 \
    libcairo2 libcups2 libdrm2 libgbm1 libglib2.0-0 libgtk-3-0 \
    libnspr4 libnss3 libpango-1.0-0 libx11-xcb1 libxcb-dri3-0 \
    libxcomposite1 libxdamage1 libxfixes3 libxkbfile1 \
    xclip curl \
    && apt-get remove -y --purge \
        light-locker xfce4-screensaver xfce4-power-manager \
        xfce4-notifyd xfce4-pulseaudio-plugin \
        parole xfburn gigolo galculator ristretto file-roller \
        || true \
    && apt-get autoremove -y --purge \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/* /usr/share/locale/* \
    && mkdir -p /run/dbus /var/run/dbus \
    && dbus-uuidgen > /etc/machine-id

# Node.js (runtime only, no build tools)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# VSCode
RUN curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
        | gpg --dearmor -o /usr/share/keyrings/microsoft-archive-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-archive-keyring.gpg] https://packages.microsoft.com/repos/code stable main" \
        > /etc/apt/sources.list.d/vscode.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends code \
    && sed -i 's|Exec=/usr/bin/code|Exec=/usr/bin/code --no-sandbox --disable-gpu|g' /usr/share/applications/code.desktop \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/*

# Chromium
RUN apt-get update \
    && apt-get install -y --no-install-recommends software-properties-common \
    && add-apt-repository ppa:xtradeb/apps -y \
    && apt-get update \
    && apt-get install -y --no-install-recommends chromium \
    && rm -f /usr/bin/chromium-browser \
    && ln -sf /usr/bin/chromium /usr/bin/chromium-browser \
    && sed -i 's|Exec=chromium %U|Exec=chromium --no-sandbox --disable-gpu --disable-dev-shm-usage %U|g' \
        /usr/share/applications/chromium.desktop \
    && cp /usr/share/applications/chromium.desktop /usr/share/applications/chromium-browser.desktop \
    && update-alternatives --install /usr/bin/x-www-browser x-www-browser /usr/bin/chromium-browser 200 \
    && update-alternatives --set x-www-browser /usr/bin/chromium-browser \
    && fc-cache -f -v \
    && apt-get clean && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/*

# websockify + pinchtab
RUN pip3 install --no-cache-dir websockify \
    && npm install -g pinchtab \
    && npm cache clean --force

# Copy built ariad from builder stage
COPY --from=builder /aria /aria

# System config files
COPY ./ariad/root/. /

# Wallpaper
COPY ariad/ARIA-BG.png /usr/share/backgrounds/aria-bg.png

# User setup + desktop shortcuts in one layer
RUN useradd -m -s /bin/bash user \
    && echo "user ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
    && mkdir -p /tmp/aria-screenshots /home/user/Desktop \
        /home/user/.config/autostart /home/user/.local/share \
        /home/user/.cache /home/user/.pinchtab /data/pinchtab \
    && chown -R user:user /tmp/aria-screenshots /home/user /data/pinchtab \
    # Desktop shortcuts
    && for f in chromium-browser code xfce4-terminal thunar mousepad; do \
        cp -f /usr/share/applications/$f.desktop /home/user/Desktop/ 2>/dev/null || true; \
       done \
    && sed -i 's|Exec=/usr/bin/code --password-store=basic|Exec=/usr/bin/code --no-sandbox --disable-gpu --password-store=basic|' /home/user/Desktop/code.desktop 2>/dev/null || true \
    && chmod +x /home/user/Desktop/*.desktop 2>/dev/null || true \
    && gtk-update-icon-cache -f /usr/share/icons/hicolor/ 2>/dev/null || true \
    # Gmail shortcut
    && printf '[Desktop Entry]\nVersion=1.0\nType=Application\nName=Gmail\nIcon=chromium-browser\nExec=chromium-browser --no-sandbox --app=https://mail.google.com\nCategories=Network;Email;\nStartupNotify=true\n' \
        > /home/user/Desktop/gmail.desktop \
    && chmod +x /home/user/Desktop/gmail.desktop \
    # Wallpaper script
    && printf '#!/bin/bash\nsleep 3\nDISPLAY=:0 xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitorscreen/workspace0/last-image -s /usr/share/backgrounds/aria-bg.png\nDISPLAY=:0 xfconf-query -c xfce4-desktop -p /backdrop/screen0/monitorscreen/workspace0/image-style -s 5\n' \
        > /home/user/.config/set-wallpaper.sh \
    && chmod +x /home/user/.config/set-wallpaper.sh \
    && printf '[Desktop Entry]\nType=Application\nName=Set Wallpaper\nExec=/home/user/.config/set-wallpaper.sh\nHidden=false\nNoDisplay=false\nX-GNOME-Autostart-enabled=true\n' \
        > /home/user/.config/autostart/set-wallpaper.desktop \
    && chown -R user:user /home/user \
    && chmod -R 755 /home/user

WORKDIR /home/user

EXPOSE 9990 9867

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]
