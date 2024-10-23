
// import minimist from 'minimist'
// import fs from 'fs'
// import path from 'path'

const fs = require('fs');
const path = require('path');
const minimist = require('minimist')

// 扫描指定目录下的 Vue 文件，提取 $t() 中的内容
function scanVueFiles(dir) {
    const files = fs.readdirSync(dir);
    let translations = {};

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            Object.assign(translations, scanVueFiles(fullPath)); // 递归扫描子目录
        } else if (file.endsWith('.vue')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const matches = content.match(/\$t\(['"`]([^'"`]+)['"`]\)/g);

            if (matches) {
                matches.forEach(match => {
                    const key = match.replace(/\$t\(['"`]|['"`]\)/g, '').trim();
                    translations[key] = ''; // 初始化为空字符串以便后续填充翻译
                });
            }
        }
    });
    // if (Object.keys(translations) !== 0) {
    //     console.log(JSON.stringify(translations, null, 2))
    // }
    return translations;
}

// 读取旧的翻译文件以合并翻译
function readOldTranslations(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}

// 写入新的翻译文件
function writeTranslations(filePath, translations) {
    fs.writeFileSync(filePath, JSON.stringify(translations, null, 2), 'utf-8');
}

function nestedWrite(root, key, value) {
    if (key.split(".").length !== 1 ) {
        const firsetKey = key.split(".")[0]
        const node = root[firsetKey] || {}
        nestedWrite(node,  key.split(".").slice(1).join("") , value)
        root[firsetKey] = node
    } else {
        root[key] = value
    }
}

function buildJsContent(lvl, obj) {
    let content = '';
    if (Object.keys(obj).length === 0) {
        return content;
    }

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object') {
            content += "  ".repeat(lvl) + `${key}: ${buildJsContent(lvl+1,value)}`
        } else {
            content += "  ".repeat(lvl) + `${key}: '${value}',\n`
        }
    }

    if (lvl !== 1) {
        return '{\n' + content+ "  ".repeat(lvl-1)+'},\n'
    }
    return 'module.exports = {\n' + content+ "  ".repeat(lvl-1)+'};\n';
}

function writeTranslations2(filePath, translations) {
    const root = {}
    Object.entries(translations).forEach(([key, value]) => {
        nestedWrite(root, key, value)
    })
    fs.writeFileSync(filePath, buildJsContent(1,root) , 'utf-8');
}

async function readOldTranslations2(filePath) {

    if (!fs.existsSync(filePath)) return {};

    var m = require(filePath)
    var r = m.default || m
    if (typeof r === 'function') r = r()
    var result = await Promise.resolve(r)
    return result
}


// 主函数
function generateTranslationFile(srcDir, outputDir, langList) {
    const newTranslations = scanVueFiles(srcDir);

    langList.forEach((item) => {
        const outputFile = path.join(outputDir, item+'.js')
        var absPath = path.resolve(outputFile)

        readOldTranslations2(absPath).then((oldTranslations) => {
            const mergedTranslations = {  ...newTranslations, ...oldTranslations };

            writeTranslations2(outputFile, mergedTranslations);
            console.log(`generate translate map file : ${outputFile}`);

        });
    })

}

function walkObject(obj, callback) {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {

            if (typeof obj[key] === 'object' && obj[key] !== null) {
                walkObject(obj[key], callback);
            } else {
                callback(key, obj[key])
            }
        }
    }
}


function report(srcDir, outputDir, localeList) {
    const newTranslations = scanVueFiles(srcDir);

    localeList.forEach((item) => {
        const outputFile = path.join(outputDir, item+'.js')
        var absPath = path.resolve(outputFile)

        readOldTranslations2(absPath).then((oldTranslations) => {
            const mergedTranslations = {  ...newTranslations, ...oldTranslations };

            var total = 0
            var translated = 0
            var rate = 0
            walkObject(mergedTranslations, function(key, value) {
                total +=1
                if (value !== '') {
                    translated +=1
                }
            })

            if (total !== 0) {
                var rate = (translated/total * 100).toFixed(2)
            }
            console.log(`file ${outputFile}, total: ${total}, translated: ${translated}, rate: ${rate}%`)
        });
    })
}

function main() {
    const args = minimist(process.argv.slice(2), {
        "--": true
    })

    if ( args._.includes('scan') ) {
        console.log(`srcdir: ${args.srcdir}, localedir: ${args.localedir}, langlist: ${args.langlist}\n`)
        generateTranslationFile(args.srcdir, args.localedir, args.langlist? args.langlist.split(',') : [])
    } else if ( args._.includes('report') ) {
        console.log(`srcdir: ${args.srcdir}, localedir: ${args.localedir}, langlist: ${args.langlist}\n`)
        report(args.srcdir, args.localedir, args.langlist? args.langlist.split(',') : [])
    } else {
        console.log(`Usage: tr-scan <scan | report> [localedir] [srcdir] [langlist]
        Example:
            tr-scan scan --srcdir ./src --localedir ./src/locale --langlist en-US,zh-CN
            tr-scan report --srcdir ./src --localedir ./src/locale --langlist en-US,zh-CN`)
    }



}

main()