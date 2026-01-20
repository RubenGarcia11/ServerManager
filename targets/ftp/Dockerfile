FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    vsftpd \
    openssh-server \
    htop \
    && rm -rf /var/lib/apt/lists/*

# Setup SSH
RUN mkdir -p /var/run/sshd
RUN echo 'root:password' | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Setup FTP user and directories
RUN mkdir -p /var/run/vsftpd/empty
RUN useradd -m -d /home/ftpuser -s /bin/bash ftpuser
RUN echo "ftpuser:ftp123" | chpasswd

# Create writable directory inside home
RUN mkdir -p /home/ftpuser/archivos
RUN chown ftpuser:ftpuser /home/ftpuser/archivos
RUN chmod 755 /home/ftpuser

# vsftpd config - simple local user setup
RUN echo "listen=YES" > /etc/vsftpd.conf
RUN echo "local_enable=YES" >> /etc/vsftpd.conf
RUN echo "write_enable=YES" >> /etc/vsftpd.conf
RUN echo "local_umask=022" >> /etc/vsftpd.conf
RUN echo "chroot_local_user=YES" >> /etc/vsftpd.conf
RUN echo "allow_writeable_chroot=YES" >> /etc/vsftpd.conf
RUN echo "pasv_enable=YES" >> /etc/vsftpd.conf
RUN echo "pasv_min_port=21000" >> /etc/vsftpd.conf
RUN echo "pasv_max_port=21010" >> /etc/vsftpd.conf
RUN echo "user_sub_token=\$USER" >> /etc/vsftpd.conf
RUN echo "local_root=/home/ftpuser" >> /etc/vsftpd.conf

EXPOSE 20 21 22 21000-21010

CMD /usr/sbin/sshd && /usr/sbin/vsftpd /etc/vsftpd.conf
