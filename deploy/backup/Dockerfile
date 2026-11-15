# pg_dump 16 + rclone (MIT) + cron for the shop-backup service.
FROM postgres:16-alpine
RUN apk add --no-cache rclone tzdata
ENV TZ=America/Sao_Paulo
COPY crontab /etc/crontabs/root
# crond gives jobs an empty environment: save the container's for the scripts.
CMD ["sh", "-c", "export -p > /etc/backup.env && exec crond -f -l 6"]
