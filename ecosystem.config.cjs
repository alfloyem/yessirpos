module.exports = {
    apps: [
        {
            name: "bspos",
            script: "bash",
            args: '-c "node --env-file=.env .output/server/index.mjs"',
            cwd: "/root/BakuStreet/bspos",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
