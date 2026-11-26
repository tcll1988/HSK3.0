// サンプル問題の一覧。音声とPDFは ../HSK3.0_新版样卷/ の原本をそのまま使います。
// 新しい冊子を足すときは、ここに1行足し、levels.js に構成、papers/<ID>/ にデータと画像を置きます。
const sampleRoot='../HSK3.0_新版样卷/';
const paperCatalog={
 S1:{level:'1',name:'1級',pdf:'一级/样卷_题目.pdf',answers:'一级/样卷_答案.pdf',media:{main:'一级/样卷_录音.mp3'}},
 S2:{level:'2',name:'2級',pdf:'二级/样卷_题目.pdf',answers:'二级/样卷_答案.pdf',media:{main:'二级/样卷_录音.mp3'}},
 S3:{level:'3',name:'3級',pdf:'三级/样卷_题目.pdf',answers:'三级/样卷_答案.pdf',media:{main:'三级/样卷_录音.mp3'}},
 S4:{level:'4',name:'4級',pdf:'四级/样卷_题目.pdf',answers:'四级/样卷_答案.pdf',media:{main:'四级/样卷_录音.mp3'}},
 S5:{level:'5',name:'5級',pdf:'五级/样卷_题目.pdf',answers:'五级/样卷_答案.pdf',media:{main:'五级/样卷_录音.mp3'}},
 S6:{level:'6',name:'6級',pdf:'六级/样卷_题目.pdf',answers:'六级/样卷_答案.pdf',media:{main:'六级/样卷_录音.mp3'}},
 S79:{level:'7–9',name:'7–9級',pdf:'七-九级/样卷_题目.pdf',answers:'七-九级/样卷_答案.pdf',media:{main:'七-九级/样卷_听力录音.mp3',oral:'七-九级/样卷_口试录音.mp3'}},
 K3:{level:'3',name:'3級 口語',oral:true,pdf:'口语/三级_口语样卷.pdf',media:{main:'口语/三级_口语样卷_录音.mp3'}},
 K4:{level:'4',name:'4級 口語',oral:true,pdf:'口语/四级_口语样卷.pdf',media:{main:'口语/四级_口语样卷_录音.mp3'}},
 K5:{level:'5',name:'5級 口語',oral:true,pdf:'口语/五级_口语样卷.pdf',media:{main:'口语/五级_口语样卷_录音.mp3'}},
 K6:{level:'6',name:'6級 口語',oral:true,pdf:'口语/六级_口语样卷.pdf',media:{main:'口语/六级_口语样卷_录音.mp3'}}
};
