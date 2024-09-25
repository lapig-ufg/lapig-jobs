FROM lapig/app_lapig_jobs:base

# Clone app and npm install on server
ENV URL_TO_APPLICATION_GITHUB="https://github.com/lapig-ufg/lapig-jobs.git"
ENV BRANCH="main"

LABEL maintainer="Renato Gomes <renatogomessilverio@gmail.com>"

RUN cd /APP && git clone -b ${BRANCH} ${URL_TO_APPLICATION_GITHUB} && \
    cd /APP/lapig-jobs && npm install
    
CMD [ "/bin/bash", "-c", "/APP/src/server/prod-start.sh; tail -f /dev/null"]

ENTRYPOINT [ "/APP/Monitora.sh"]
