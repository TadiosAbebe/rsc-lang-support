const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const isMinify = process.argv.includes('--minify');

async function build() {
    if (isMinify && fs.existsSync('./dist')) {
        for (const file of fs.readdirSync('./dist')) {
            if (file.endsWith('.map')) {
                fs.unlinkSync(path.join('./dist', file));
            }
        }
    }
    const clientConfig = {
        entryPoints: ['./client/src/extension.ts'],
        bundle: true,
        outfile: './dist/extension.js',
        external: ['vscode'],
        format: 'cjs',
        platform: 'node',
        sourcemap: !isMinify,
        minify: isMinify,
        target: 'node18'
    };

    const serverConfig = {
        entryPoints: ['./server/src/server.ts'],
        bundle: true,
        outfile: './dist/server.js',
        format: 'cjs',
        platform: 'node',
        sourcemap: !isMinify,
        minify: isMinify,
        target: 'node18'
    };

    const testConfig = {
        entryPoints: ['./test/routeros.test.ts'],
        bundle: true,
        outfile: './out/test/routeros.test.js',
        format: 'cjs',
        platform: 'node',
        sourcemap: true,
        target: 'node18',
        external: ['node:test', 'node:assert', 'node:fs', 'node:path', 'vscode']
    };

    if (isWatch) {
        const clientCtx = await esbuild.context(clientConfig);
        const serverCtx = await esbuild.context(serverConfig);
        await Promise.all([clientCtx.watch(), serverCtx.watch()]);
        console.log('Watching for changes...');
    } else {
        await Promise.all([
            esbuild.build(clientConfig),
            esbuild.build(serverConfig),
            esbuild.build(testConfig)
        ]);
        console.log('Build complete: dist/extension.js, dist/server.js, out/test/routeros.test.js generated.');
    }
}

build().catch(err => {
    console.error(err);
    process.exit(1);
});

