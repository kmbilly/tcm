#!/bin/bash
cd /var/lib/openshift/53aa7490e0b8cdae2900045b/app-root/repo/jobs
node jtwc_update_db.js

# housekeep log
tail -n 10 jtwc_update_db.js.log > jtwc_update_db.js.log.trim
mv jtwc_update_db.js.log.trim jtwc_update_db.js.log
