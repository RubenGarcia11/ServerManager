FROM nginx:latest

# Install SSH for management/stats logic
RUN apt-get update && apt-get install -y openssh-server htop && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/run/sshd
RUN echo 'root:password' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Custom index
RUN echo "<h1>Server Manager - Web Target</h1><p>Monitoring active...</p>" > /usr/share/nginx/html/index.html

EXPOSE 80 22

# Nginx runs in foreground by default, but we need sshd too. 
# A simple script to start both.
RUN echo "#!/bin/sh\n/usr/sbin/sshd\nnginx -g 'daemon off;'" > /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
