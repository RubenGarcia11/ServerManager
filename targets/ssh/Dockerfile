FROM ubuntu:22.04

# Install SSH and stats tools
RUN apt-get update && apt-get install -y \
    openssh-server \
    htop \
    iproute2 \
    net-tools \
    sudo \
    curl \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Setup SSH
RUN mkdir /var/run/sshd
RUN echo 'root:password' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
RUN sed -i 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' /etc/pam.d/sshd

ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile

# Create a non-root user
RUN useradd -rm -d /home/admin -s /bin/bash -g root -G sudo -u 1000 admin
RUN echo 'admin:password' | chpasswd

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
