/* ONLINE VERSION of werewolf.js - upload this file to GitHub (online game only).
   The offline app keeps using werewolf.js. Edit the two files separately on purpose. */
// ============================================================================================================
//  SHADOW WEREWOLF  (HEROIC third boss of the Prism Caverns - replaces the Lava Hound, which is now the HARD last boss)
//
//  Every turn:
//    1) MOVE FIRST   - runs a few steps to a random side
//    2) DOUBLE CLAW  - runs to a RANDOM player and attacks with a double claw slash = two hits in a row (double damage).
//                      If that player stands on FLOATING GROUND the werewolf runs to the foot of it and LEAPS up next to him first
//                      (and when the werewolf is up on a platform and the player is below it runs to the edge and jumps down).
//    every 3rd turn (instead of the double claw):
//       STRIKE FORWARD - runs to the farthest left OR right side of the map, then dashes across the WHOLE map with the strike-forward
//                      slash; every player standing on the ground in his path takes strong damage (jump over him to be safe).
//  Two small RED werewolves (Blood Wolves) are on the field from the very first turn. They use the very same turn logic.
//  They have a lot of health, and once dead they NEVER come back (they only spawn when the game starts).
//
//  Animations: your sheet (idle 4 | run 6 | double attack 6 | jump 4 | strike forward 6 | death 7 = 33 frames, 320x240 cells, 5 per row)
//  PLUS 40 generated in-between frames (rows 7-15 of the sheet) so every move glides.  Frames were re-centred / re-sized so nothing teleports.
//  The RUN cycle is driven by the DISTANCE he really runs (one cycle = WW_STRIDE px), so the paws match the ground: no foot sliding.
//  He speeds up when he starts and slows down (finishing the stride) when he stops.
//  Built on the boss3.js framework like scorpion.js: wraps BOSS3.think / step / update / draw / assets, AI.swarmStep and drawWorm.
// ============================================================================================================

// ---- TUNING ----
const WW_CLAW_MUL = 1;                 // damage of ONE claw hit = boss weapon damage x this (two hits per double claw)
const WW_STRIKE_MUL = 2.6;             // strike-forward damage (strong) = boss weapon damage x this (minions: their claw damage x WW_MIN_STRIKE_MUL)
const WW_MIN_CLAW_MUL = 1, WW_MIN_STRIKE_MUL = 2.2;
const WW_RUN = 14;                     // run speed in world px per tick, per 1.0 of size (boss ~16, small wolves ~10)
const WW_STRIDE = 450;                 // world px covered by ONE full run cycle (6 frames) per 1.0 of size. Bigger = slower legs for the same speed
const WW_DASH = 21;                    // strike-forward dash speed (px per tick, per 1.0 of size)
const WW_STEP_MIN = 170, WW_STEP_MAX = 360;   // the "move first" run
const WW_REACH = 130, WW_HIT_FRONT = 190, WW_HIT_BACK = 45, WW_STRIKE_R = 105;   // stop distance from the player / claw reach / reach behind / strike hit radius (per 1.0 of size)
const WW_EDGE_L = 420, WW_EDGE_R = 2380;       // the two sides of the map the strike starts from / ends at
const WW_LEAP_DY = 55;                 // height difference (px) that makes him leap instead of run
const WW_PX = 1.15;                    // world px per sprite px at size 3.0 (boss). The small wolves are smaller (CMINIONS.werewolf.sc)
const WW_BOSS_SC = 3.0;

// ---- sheet layout ----
const WWF = { CW: 320, CH: 240, AX: 150, FY: 226, COLS: 5, IDLE: 0, RUN: 4, DBL: 10, JUMP: 16, STRIKE: 20, DEATH: 26 };
const WW_ACT = 'adventure/boss_werewolf_act.webp', WW_ACT_MIN = 'adventure/minion_werewolf_act.webp';
const WW_TW = {"0-1":33,"1-2":34,"2-3":35,"4-5":36,"5-6":37,"6-7":38,"7-8":39,"8-9":40,"4-9":41,"0-4":42,"0-9":43,"10-11":44,"11-12":45,"12-13":46,"13-14":47,"14-15":48,"0-10":49,"0-15":50,"16-17":51,"17-18":52,"18-19":53,"16-19":54,"0-16":55,"20-21":56,"21-22":57,"22-23":58,"23-24":59,"24-25":60,"22-24":61,"23-25":62,"22-25":63,"0-20":64,"0-25":65,"26-27":66,"27-28":67,"28-29":68,"29-30":69,"30-31":70,"31-32":71,"0-26":72};   // in-between frames: 'lowFrame-highFrame' -> frame number on the sheet

// ---- floating rocks of the Moonlit Geode (picture: assets/adventure/arena_werewolf.png) ----
const WW_ROCK_RUNS = {"886":[367,377],"887":[367,379],"888":[367,382],"889":[367,383],"890":[367,385],"891":[367,386],"892":[367,387],"893":[367,388],"894":[367,390],"895":[367,391],"896":[367,392],"897":[367,393],"898":[367,393],"899":[367,394],"900":[367,395],"901":[367,396],"902":[367,397],"903":[367,397],"904":[367,398],"905":[367,398],"906":[366,398],"907":[366,398],"908":[366,398],"909":[366,397],"910":[366,397],"911":[366,397],"912":[366,398],"913":[366,398],"914":[366,398],"915":[366,399],"916":[366,399],"917":[366,400],"918":[366,401],"919":[366,402],"920":[366,404],"921":[366,405],"922":[366,406],"923":[366,407],"924":[366,409],"925":[366,410],"926":[366,411],"927":[366,412],"928":[366,413],"929":[366,414],"930":[366,414],"931":[366,415],"932":[366,415],"933":[366,415],"934":[366,416],"935":[366,416],"936":[366,416],"937":[366,416],"938":[366,417],"939":[366,417],"940":[366,417],"941":[366,417],"942":[365,417],"943":[365,418],"944":[365,418],"945":[365,420],"946":[365,421],"947":[365,423],"948":[365,425],"949":[364,427],"950":[364,428],"951":[364,426],"952":[364,424],"953":[364,423],"954":[364,421],"955":[364,420],"956":[364,420],"957":[363,420],"958":[363,421],"959":[363,421],"960":[363,421],"961":[363,421],"962":[363,421],"963":[363,421],"964":[363,421],"965":[364,421],"966":[364,422],"967":[364,422],"968":[364,422],"969":[364,422],"970":[364,422],"971":[364,422],"972":[364,422],"973":[365,422],"974":[365,422],"975":[365,422],"976":[365,422],"977":[365,422],"978":[365,422],"979":[365,422],"980":[365,422],"981":[365,423],"982":[366,423],"983":[366,423],"984":[366,423],"985":[366,423],"986":[366,423],"987":[366,423],"988":[366,423],"989":[366,423],"990":[366,423],"991":[366,423],"992":[366,423],"993":[366,423],"994":[366,423],"995":[366,423],"996":[366,423],"997":[366,423],"998":[366,423],"999":[366,423],"1000":[366,423],"1001":[366,422],"1002":[366,422],"1003":[366,422],"1004":[366,422],"1005":[366,422],"1006":[366,422],"1007":[366,422],"1008":[366,424],"1009":[366,429],"1010":[366,434],"1011":[366,439],"1012":[366,444],"1013":[366,449],"1014":[366,454],"1015":[366,459],"1016":[366,458],"1017":[366,453],"1018":[366,448],"1019":[366,443],"1020":[366,438],"1021":[366,433],"1022":[366,428],"1023":[366,423],"1024":[366,420],"1025":[366,420],"1026":[366,420],"1027":[366,420],"1028":[367,420],"1029":[367,420],"1030":[367,420],"1031":[367,421],"1032":[367,425],"1033":[367,429],"1034":[367,433],"1035":[366,437],"1036":[366,441],"1037":[366,445],"1038":[366,449],"1039":[366,453],"1040":[366,449],"1041":[366,445],"1042":[365,441],"1043":[365,437],"1044":[365,433],"1045":[365,429],"1046":[365,425],"1047":[364,421],"1048":[364,416],"1049":[364,416],"1050":[364,416],"1051":[364,416],"1052":[364,416],"1053":[364,416],"1054":[364,416],"1055":[364,416],"1056":[364,416],"1057":[364,416],"1058":[364,416],"1059":[364,416],"1060":[364,416],"1061":[364,416],"1062":[364,416],"1063":[364,416],"1064":[364,416],"1065":[364,416],"1066":[364,415],"1067":[364,415],"1068":[364,414],"1069":[364,414],"1070":[364,413],"1071":[364,413],"1072":[364,412],"1073":[364,412],"1074":[364,411],"1075":[364,411],"1076":[364,410],"1077":[364,410],"1078":[364,409],"1079":[364,408],"1080":[364,408],"1081":[364,407],"1082":[364,407],"1083":[364,406],"1084":[364,405],"1085":[364,404],"1086":[364,403],"1087":[364,402],"1088":[365,401],"1089":[365,400],"1090":[365,399],"1091":[365,398],"1092":[365,397],"1093":[365,396],"1094":[365,395],"1095":[365,394],"1096":[365,394],"1097":[365,393],"1098":[366,392],"1099":[366,391],"1100":[366,391],"1101":[366,390],"1102":[366,389],"1103":[366,388],"1104":[366,387],"1105":[366,386],"1106":[366,385],"1107":[366,384],"1108":[366,383],"1109":[366,382],"1110":[366,380],"1111":[366,379],"1112":[366,377],"1113":[366,375],"1114":[366,372],"1131":[207,218],"1132":[206,221],"1133":[206,223],"1134":[206,225],"1135":[206,227],"1136":[206,229],"1137":[206,231],"1138":[205,232],"1139":[205,233],"1140":[205,235],"1141":[205,236],"1142":[205,237],"1143":[204,238],"1144":[204,238],"1145":[204,238],"1146":[204,239],"1147":[204,239],"1148":[204,239],"1149":[203,239],"1150":[203,239],"1151":[203,240],"1152":[203,244],"1153":[203,247],"1154":[203,251],"1155":[203,254],"1156":[203,257],"1157":[203,261],"1158":[203,264],"1159":[203,268],"1160":[203,271],"1161":[204,275],"1162":[204,278],"1163":[204,282],"1164":[204,285],"1165":[204,286],"1166":[204,282],"1167":[204,279],"1168":[204,275],"1169":[204,272],"1170":[204,268],"1171":[204,265],"1172":[204,261],"1173":[204,258],"1174":[204,255],"1175":[204,253],"1176":[204,253],"1177":[204,253],"1178":[204,252],"1179":[204,252],"1180":[204,251],"1181":[204,251],"1182":[204,251],"1183":[204,251],"1184":[205,251],"1185":[205,251],"1186":[205,251],"1187":[205,251],"1188":[205,251],"1189":[205,251],"1190":[205,251],"1191":[205,251],"1192":[205,251],"1193":[206,250],"1194":[206,250],"1195":[206,250],"1196":[206,250],"1197":[206,250],"1198":[206,253],"1199":[206,256],"1200":[206,259],"1201":[206,262],"1202":[206,265],"1203":[206,264],"1204":[206,261],"1205":[206,258],"1206":[206,255],"1207":[206,252],"1208":[206,250],"1209":[206,249],"1210":[206,249],"1211":[206,249],"1212":[206,249],"1213":[206,249],"1214":[206,249],"1215":[206,248],"1216":[206,248],"1217":[206,248],"1218":[206,248],"1219":[206,248],"1220":[206,248],"1221":[206,248],"1222":[206,248],"1223":[206,248],"1224":[206,248],"1225":[206,248],"1226":[206,247],"1227":[206,247],"1228":[206,247],"1229":[206,247],"1230":[206,246],"1231":[206,246],"1232":[206,245],"1233":[206,244],"1234":[206,244],"1235":[206,243],"1236":[206,242,330,340],"1237":[206,241,330,343],"1238":[206,240,330,345],"1239":[206,239,330,347],"1240":[206,239,330,348],"1241":[207,238,331,350],"1242":[207,237,331,351],"1243":[207,236,331,353],"1244":[207,235,331,354],"1245":[207,234,331,356],"1246":[207,233,331,357],"1247":[207,231,331,359],"1248":[207,230,331,361],"1249":[207,229,331,363],"1250":[207,227,331,365],"1251":[207,226,331,367],"1252":[206,224,331,369],"1253":[206,222,331,371],"1254":[206,220,331,373],"1255":[206,218,331,374],"1256":[206,216,331,376],"1257":[206,213,331,378],"1258":[206,211,331,379],"1259":[205,208,331,380],"1260":[331,382],"1261":[331,383],"1262":[331,384],"1263":[331,385],"1264":[331,386],"1265":[331,387],"1266":[331,388],"1267":[331,389],"1268":[331,390],"1269":[331,391],"1270":[331,392],"1271":[331,393],"1272":[331,394],"1273":[331,395],"1274":[331,396],"1275":[331,397],"1276":[331,398],"1277":[331,399],"1278":[331,399],"1279":[331,400],"1280":[331,400],"1281":[331,401],"1282":[331,402],"1283":[331,402],"1284":[331,403],"1285":[331,403],"1286":[331,404],"1287":[331,404],"1288":[331,405],"1289":[331,405],"1290":[331,406],"1291":[331,407],"1292":[331,407],"1293":[331,408],"1294":[331,408],"1295":[331,409],"1296":[331,410],"1297":[331,410],"1298":[331,411],"1299":[331,411],"1300":[331,412],"1301":[331,412],"1302":[331,413],"1303":[331,413],"1304":[331,414],"1305":[331,416],"1306":[331,422],"1307":[331,428],"1308":[331,434],"1309":[331,440],"1310":[331,446],"1311":[331,452],"1312":[330,449],"1313":[330,444],"1314":[330,438],"1315":[330,432],"1316":[330,426],"1317":[330,420],"1318":[330,416],"1319":[330,416],"1320":[330,416],"1321":[330,417],"1322":[330,418],"1323":[330,418],"1324":[330,419],"1325":[330,420],"1326":[330,421],"1327":[330,422],"1328":[330,423],"1329":[331,424],"1330":[331,425],"1331":[331,426],"1332":[331,427],"1333":[331,428],"1334":[331,428],"1335":[331,428],"1336":[331,429],"1337":[331,429],"1338":[331,428],"1339":[331,428],"1340":[331,427],"1341":[331,427],"1342":[331,426],"1343":[331,426],"1344":[331,429],"1345":[331,426],"1346":[331,424],"1347":[331,423],"1348":[331,422],"1349":[331,422],"1350":[331,422],"1351":[331,423],"1352":[330,423],"1353":[330,424],"1354":[330,424],"1355":[330,425],"1356":[329,426],"1357":[329,427],"1358":[329,428],"1359":[329,429],"1360":[329,429],"1361":[328,430],"1362":[328,431],"1363":[328,431],"1364":[328,432],"1365":[328,432],"1366":[328,432],"1367":[328,432],"1368":[328,432],"1369":[328,432],"1370":[328,432],"1371":[328,431],"1372":[328,431],"1373":[328,431],"1374":[328,431],"1375":[328,430],"1376":[328,430],"1377":[328,430],"1378":[328,430],"1379":[328,430],"1380":[328,430],"1381":[328,430],"1382":[328,430],"1383":[328,430],"1384":[328,431],"1385":[328,431],"1386":[328,432],"1387":[328,432],"1388":[328,432],"1389":[328,433],"1390":[328,433],"1391":[328,433],"1392":[328,434],"1393":[328,434],"1394":[328,434],"1395":[328,434],"1396":[328,434],"1397":[328,434],"1398":[328,434],"1399":[328,434],"1400":[328,434],"1401":[328,434],"1402":[329,434],"1403":[329,434],"1404":[329,434],"1405":[329,434],"1406":[329,434],"1407":[329,434],"1408":[329,434],"1409":[329,434],"1410":[329,433],"1411":[330,433],"1412":[330,433],"1413":[330,433],"1414":[330,432],"1415":[330,432],"1416":[330,431],"1417":[330,431],"1418":[330,430],"1419":[330,430],"1420":[330,429],"1421":[330,429],"1422":[330,428],"1423":[330,428],"1424":[330,428],"1425":[331,428],"1426":[331,427],"1427":[331,427],"1428":[331,427],"1429":[331,427],"1430":[331,427],"1431":[332,427],"1432":[332,427],"1433":[332,427],"1434":[332,427],"1435":[332,426],"1436":[332,426],"1437":[332,426],"1438":[332,426],"1439":[332,426],"1440":[332,426],"1441":[332,425],"1442":[332,425],"1443":[332,425],"1444":[332,425],"1445":[332,425],"1446":[332,425],"1447":[332,426],"1448":[332,426],"1449":[332,426],"1450":[332,426],"1451":[332,426],"1452":[332,426],"1453":[332,426],"1454":[332,425],"1455":[332,425],"1456":[332,425],"1457":[332,424],"1458":[332,424],"1459":[332,423],"1460":[332,422],"1461":[332,422],"1462":[332,421],"1463":[332,423],"1464":[332,428],"1465":[332,433],"1466":[332,438],"1467":[332,436],"1468":[332,431],"1469":[332,426],"1470":[332,421],"1471":[332,417],"1472":[332,415],"1473":[332,415],"1474":[332,415],"1475":[332,415],"1476":[332,415],"1477":[332,415],"1478":[332,415],"1479":[332,415],"1480":[332,415],"1481":[332,415],"1482":[332,415],"1483":[332,415],"1484":[332,415],"1485":[332,415],"1486":[332,414],"1487":[332,414],"1488":[332,413],"1489":[332,412],"1490":[331,412],"1491":[331,411],"1492":[331,410],"1493":[331,409],"1494":[331,409],"1495":[331,408],"1496":[331,407],"1497":[330,406],"1498":[330,406],"1499":[330,405],"1500":[330,404],"1501":[330,404],"1502":[329,403],"1503":[329,403],"1504":[329,402],"1505":[329,402],"1506":[329,401],"1507":[329,401],"1508":[328,400],"1509":[328,400],"1510":[328,399],"1511":[328,399],"1512":[328,398],"1513":[328,398],"1514":[328,397],"1515":[328,396],"1516":[328,396],"1517":[328,395],"1518":[328,395],"1519":[328,395],"1520":[328,395],"1521":[328,395],"1522":[328,394],"1523":[328,394],"1524":[328,394],"1525":[328,394],"1526":[328,394],"1527":[328,393],"1528":[328,393],"1529":[328,392],"1530":[328,392],"1531":[328,391],"1532":[328,389],"1533":[328,388],"1534":[328,387],"1535":[328,385],"1536":[328,384],"1537":[328,382],"1538":[328,381],"1539":[328,379],"1540":[328,377],"1541":[328,376],"1542":[328,374],"1543":[328,373],"1544":[328,372],"1545":[328,370],"1546":[328,369],"1547":[328,368],"1548":[328,367],"1549":[328,365],"1550":[328,364],"1551":[328,363],"1552":[328,362],"1553":[328,360],"1554":[328,359],"1555":[328,357],"1556":[328,356],"1557":[328,354],"1558":[328,352],"1559":[328,350],"1560":[328,348],"1561":[191,194,328,346],"1562":[191,197,328,344],"1563":[191,200,328,341],"1564":[191,202,328,337],"1565":[191,203],"1566":[191,205],"1567":[191,206],"1568":[191,207],"1569":[191,209],"1570":[191,210],"1571":[192,219],"1572":[192,222],"1573":[192,226],"1574":[192,229],"1575":[192,232],"1576":[192,235],"1577":[192,238],"1578":[192,241],"1579":[192,244],"1580":[192,247],"1581":[192,250],"1582":[192,253],"1583":[192,256],"1584":[192,259],"1585":[192,262],"1586":[192,265],"1587":[192,268],"1588":[192,267],"1589":[192,264],"1590":[192,261],"1591":[192,258],"1592":[192,255],"1593":[192,252],"1594":[192,249],"1595":[192,246],"1596":[192,243],"1597":[191,240],"1598":[191,237],"1599":[191,237],"1600":[191,238],"1601":[191,239],"1602":[191,240],"1603":[191,240],"1604":[191,241],"1605":[191,241],"1606":[191,241],"1607":[191,241],"1608":[191,241],"1609":[191,240],"1610":[191,240],"1611":[191,239],"1612":[190,238],"1613":[190,237],"1614":[190,237],"1615":[190,236],"1616":[190,235],"1617":[190,234],"1618":[190,234],"1619":[189,234],"1620":[189,234],"1621":[189,234],"1622":[189,234],"1623":[189,235],"1624":[189,235],"1625":[188,236],"1626":[188,237],"1627":[188,238],"1628":[188,239],"1629":[188,239],"1630":[188,240],"1631":[188,241],"1632":[188,241],"1633":[188,242],"1634":[188,242],"1635":[188,242],"1636":[188,242],"1637":[188,242],"1638":[188,242],"1639":[188,242],"1640":[188,242],"1641":[188,242],"1642":[189,244],"1643":[189,248],"1644":[189,252],"1645":[189,256],"1646":[189,261],"1647":[189,265],"1648":[189,269],"1649":[190,273],"1650":[190,278],"1651":[190,282],"1652":[190,283],"1653":[190,278],"1654":[190,274],"1655":[190,270],"1656":[190,266],"1657":[190,261],"1658":[190,257],"1659":[190,253],"1660":[190,249],"1661":[190,244],"1662":[190,240],"1663":[190,236],"1664":[190,232],"1665":[190,227],"1666":[190,226],"1667":[190,225],"1668":[190,224],"1669":[191,223],"1670":[191,222],"1671":[191,221],"1672":[191,219],"1673":[191,218],"1674":[191,217],"1675":[191,215],"1676":[191,214],"1677":[191,212],"1678":[191,211],"1679":[191,210],"1680":[191,208],"1681":[191,207,356,363],"1682":[191,206,356,366],"1683":[191,205,356,368],"1684":[191,204,356,370],"1685":[191,203,356,371],"1686":[191,202,356,373],"1687":[190,200,356,374],"1688":[190,199,356,375],"1689":[190,197,356,376],"1690":[356,377],"1691":[356,378],"1692":[356,379],"1693":[356,380],"1694":[356,381],"1695":[356,382],"1696":[356,383],"1697":[356,384],"1698":[356,384],"1699":[356,385],"1700":[356,385],"1701":[356,386],"1702":[356,386],"1703":[356,386],"1704":[356,386],"1705":[356,387],"1706":[356,387],"1707":[356,387],"1708":[356,388],"1709":[356,388],"1710":[356,389],"1711":[356,391],"1712":[356,395],"1713":[356,398],"1714":[356,402],"1715":[356,405],"1716":[357,409],"1717":[357,412],"1718":[357,416],"1719":[357,420],"1720":[357,423],"1721":[357,427],"1722":[357,430],"1723":[357,434],"1724":[357,438],"1725":[357,441],"1726":[357,445],"1727":[357,448],"1728":[357,452],"1729":[357,451],"1730":[357,447],"1731":[357,443],"1732":[357,440],"1733":[357,436],"1734":[357,433],"1735":[356,429],"1736":[356,426],"1737":[356,422],"1738":[356,418],"1739":[355,415],"1740":[355,411],"1741":[355,408],"1742":[354,406],"1743":[354,406],"1744":[354,406],"1745":[354,406],"1746":[353,406],"1747":[353,405],"1748":[353,405],"1749":[353,405],"1750":[353,405],"1751":[353,404],"1752":[353,404],"1753":[353,404],"1754":[353,404],"1755":[353,404],"1756":[353,405],"1757":[353,405],"1758":[353,406],"1759":[353,406],"1760":[354,407],"1761":[354,408],"1762":[354,409],"1763":[354,410],"1764":[355,410],"1765":[355,411],"1766":[355,412],"1767":[355,413],"1768":[356,413],"1769":[356,414],"1770":[356,414],"1771":[356,414],"1772":[356,414],"1773":[357,414],"1774":[357,414],"1775":[357,414],"1776":[357,414],"1777":[357,413],"1778":[357,413],"1779":[357,413],"1780":[357,413],"1781":[357,413],"1782":[357,413],"1783":[357,413],"1784":[357,412],"1785":[357,412],"1786":[356,413],"1787":[356,413],"1788":[356,413],"1789":[356,413],"1790":[356,413],"1791":[356,414],"1792":[356,414],"1793":[356,414],"1794":[356,415],"1795":[356,415],"1796":[356,415],"1797":[356,415],"1798":[356,416],"1799":[356,416],"1800":[356,416],"1801":[356,416],"1802":[356,416],"1803":[356,416],"1804":[356,418],"1805":[356,416],"1806":[356,414],"1807":[355,414],"1808":[355,414],"1809":[355,413],"1810":[355,413],"1811":[355,413],"1812":[354,412],"1813":[354,412],"1814":[354,412],"1815":[354,412],"1816":[354,412],"1817":[354,412],"1818":[353,412],"1819":[353,413],"1820":[353,413],"1821":[353,414],"1822":[353,414],"1823":[353,415],"1824":[353,415],"1825":[353,415],"1826":[353,416],"1827":[353,416],"1828":[353,416],"1829":[353,416],"1830":[354,416],"1831":[354,416],"1832":[354,416],"1833":[354,415],"1834":[355,414],"1835":[355,414],"1836":[355,413],"1837":[355,412],"1838":[356,411],"1839":[356,410],"1840":[356,409],"1841":[356,408],"1842":[357,411],"1843":[357,415],"1844":[357,418],"1845":[357,422],"1846":[357,426],"1847":[357,429],"1848":[357,433],"1849":[357,437],"1850":[357,440],"1851":[357,444],"1852":[357,448],"1853":[357,449],"1854":[357,445],"1855":[357,441],"1856":[357,438],"1857":[356,434],"1858":[356,430],"1859":[356,426],"1860":[356,423],"1861":[356,419],"1862":[356,415],"1863":[355,412],"1864":[355,408],"1865":[355,405],"1866":[355,405],"1867":[355,404],"1868":[355,403],"1869":[355,403],"1870":[355,402],"1871":[355,402],"1872":[355,401],"1873":[355,400],"1874":[355,400],"1875":[355,399],"1876":[355,399],"1877":[355,399],"1878":[355,398],"1879":[355,398],"1880":[355,398],"1881":[355,398],"1882":[355,398],"1883":[355,398],"1884":[355,397],"1885":[356,397],"1886":[356,397],"1887":[356,397],"1888":[356,396],"1889":[356,396],"1890":[356,395],"1891":[356,395],"1892":[356,394],"1893":[356,392],"1894":[356,391],"1895":[356,390],"1896":[356,388],"1897":[356,387],"1898":[356,385],"1899":[356,383],"1900":[356,382],"1901":[356,380],"1902":[356,379],"1903":[356,378],"1904":[355,376],"1905":[355,375],"1906":[355,374],"1907":[355,373],"1908":[355,372],"1909":[354,371],"1910":[354,370],"1911":[354,369],"1912":[354,368],"1913":[353,367],"1914":[353,366],"1915":[353,365],"1916":[353,363],"1917":[353,361],"1918":[353,359],"1919":[353,357]};
const WW_ROCK_Y = 560;   // every rock is above this row, and its lowest point is y 459 (the boss is ~260 px tall and the floor is at y 800, so he runs UNDER them)
// world.js clearPath() flattens every floating block in the walkway on boss stages: put the rocks back afterwards (only on this arena)
(function () {
  if (typeof clearPath !== 'function') return;
  const _cp = clearPath;
  clearPath = function (T) {
    const r = _cp.apply(this, arguments);
    if (T && T.map && T.map.id === 'adv_prism_b3w' && typeof MAP_RUNS !== 'undefined') {
      const im = getImg(T.map.img), W = T.W, runs = MAP_RUNS[T.map.id];
      if (im && im.complete && im.naturalWidth) {
        for (const c of [T.ctx, T.bak && T.bak.getContext('2d')]) if (c) c.drawImage(im, 0, 0, W, WW_ROCK_Y, 0, 0, W, WW_ROCK_Y);
        for (let x = 0; x < W; x++) { const q = runs[x]; for (let k = 0; k < q.length; k += 2) if (q[k] < WW_ROCK_Y) for (let y = q[k]; y < q[k + 1] && y < WW_ROCK_Y; y++) T.mask[y * W + x] = 1; }
      }
    }
    return r;
  };
})();

// ---- the weapon / minion kind (kept here so the file is self contained) ----
Object.assign(SIG_WMETA, { 'MC12_Blood_Claws': { muzzle: [170, 128], bbox: [0, 0, 1, 1] } });
CMINIONS.werewolf = { name: "Blood Wolf", hpMul: 6, sc: 1.9, fly: false, sheet: 'adventure/minion_werewolf_hold.webp', death: 'adventure/minion_werewolf_death.webp', act: WW_ACT_MIN,
  anchors: Array.from({ length: 9 }, () => ({ n: [238, 300], f: [238, 300] })),
  mw: { id: 'MC12_Blood_Claws', art: 'M0_Blank', name: 'Blood Claws', desc: 'Double claw slash', ammo: Infinity, type: 'melee', range: 90, dmg: 24, knock: 5, fx: 'spark_hit', snd: 'slash', carve: 0, minion: true } };

(function () {
  // ---------- Prism Caverns: the Lava Hound moves to HARD, the Shadow Werewolf takes its place on HEROIC ----------
  const P = ADV_MAPS.find(m => m.id === 'prism');
  if (P && P.boss3) {
    const hound = P.boss3;
    P.boss3h = hound;   // HARD last boss (adventure.js stagesOf)
    // Moonlit Geode has its OWN picture (arena_werewolf.png = the Lava Hound arena + 5 floating crystal rocks), the Lava Hound arena is untouched.
    // Solid shape = the flat floor of the Lava Hound arena + the rocks (WW_ROCK_RUNS: column x -> [top,bottom, top,bottom ...] of every rock in that column)
    P.maps.arena3w = { id: 'adv_prism_b3w', name: 'Moonlit Geode', bg: P.maps.arena3.bg, img: 'adventure/arena_werewolf.png' };
    MAP_RUNS['adv_prism_b3w'] = MAP_RUNS[P.maps.arena3.id].map((r, x) => WW_ROCK_RUNS[x] ? WW_ROCK_RUNS[x].concat(r) : r);
    P.boss3 = Object.assign({}, hound, { name: 'Moonlit Geode', map: 'arena3w', b3: 'werewolf', spec: 'burn', act: WW_ACT, noMinions: false, minion: 'werewolf', minionKind: CMINIONS.werewolf, sc: WW_BOSS_SC,
      bossName: 'Shadow Werewolf', bossId: 'boss_werewolf', sheet: 'adventure/boss_werewolf_hold.webp', death: 'adventure/boss_werewolf_death.webp', anchors: Array.from({ length: 9 }, () => ({ n: [238, 300], f: [238, 300] })) });
    BOSS_GLOW.werewolf = '#b46bff';
  }
  B3_BY_KIND.werewolf = { kind: 'werewolf', key: 'werewolf', name: 'Shadow Werewolf', wide: 1 };

  const isBossW = w => !!(w && w.rob && w.rob.b3 === 'werewolf');
  const isMin = w => !!(w && w.minion && w.rob && w.rob.id === 'minion_werewolf');
  const isW = w => isBossW(w) || isMin(w);
  const ease = a => { a = Math.max(0, Math.min(1, a)); return a * a * (3 - 2 * a); };
  const px = w => WW_PX * (w.sc || WW_BOSS_SC) / 3;                         // world px per sprite px
  const sz = w => px(w) / WW_PX;                                            // 1.0 = boss
  const face = (w, t) => { if (t) w.face = t.x >= w.x ? 1 : -1; };
  const foes = w => BOSS3.foes(w);
  const dmgOf = (w, mulBoss, mulMin) => isBossW(w) ? BOSS3.dmg(w, mulBoss) : Math.max(1, Math.round(((w.mw && w.mw.dmg) || 24) * mulMin));

  // the boss weapon is part of the picture: nothing extra is drawn
  const wd = WEAPONS.find(x => x.id === 'C16_Werewolf_Claw'); if (wd) wd.art = 'M0_Blank';

  // ---------- hit shapes / body centre ----------
  const _bs = bodyShapes; bodyShapes = w => {
    if (!isW(w)) return _bs(w);
    const s = px(w), f = w.face || 1, fy = w.y - (w.hop || 0) - (w.flyOff || 0);
    return [[w.x - f * 6 * s, fy - 96 * s, 44 * s, 94 * s], [w.x + f * 14 * s, fy - 172 * s, 26 * s, 30 * s]];
  };
  const _bc = bodyCenter; bodyCenter = w => isW(w) ? [w.x, w.y - (w.hop || 0) - (w.flyOff || 0) - 100 * px(w)] : _bc(w);

  // ---------- poses: a pose is a frame number or [frameA, frameB, u] (A blended into B through the generated in-between frame) ----------
  const pp = (base, n, v) => { const m = (n - 1) * 2; v = ((v % m) + m) % m; if (v > n - 1) v = m - v; const i = Math.min(n - 2, Math.floor(v)); return [base + i, base + i + 1, ease(v - i)]; };
  const runPose = w => { const v = (((w.wwPh || 0) % 1) + 1) % 1 * 6, i = Math.floor(v) % 6; return [WWF.RUN + i, WWF.RUN + (i + 1) % 6, v - Math.floor(v)]; };
  const idlePose = w => pp(WWF.IDLE, 4, (G.frame | 0) / 14 + (w.idx | 0) * 2 + (w.x || 0) * .001);
  // keyframes: [[tick, frame], ...] -> pose at tick t (linear between neighbouring keys)
  const keys = (K, t) => { if (t <= K[0][0]) return K[0][1]; for (let i = 0; i < K.length - 1; i++) if (t < K[i + 1][0]) { const a = K[i], b = K[i + 1]; return a[1] === b[1] ? a[1] : [a[1], b[1], (t - a[0]) / (b[0] - a[0])]; } return K[K.length - 1][1]; };

  // ---------- drawing ----------
  const cv = document.createElement('canvas'); cv.width = WWF.CW; cv.height = WWF.CH; const cx = cv.getContext('2d');
  const putFrame = (ctx, img, i, al) => { ctx.globalAlpha = al; ctx.drawImage(img, (i % WWF.COLS) * WWF.CW, Math.floor(i / WWF.COLS) * WWF.CH, WWF.CW, WWF.CH, 0, 0, WWF.CW, WWF.CH); };
  const xf = (ctx, img, a, b, t) => { putFrame(ctx, img, a, t < .55 ? 1 : (1 - t) / .45); if (t > .001) putFrame(ctx, img, b, t); };   // cross-fade without a see-through dip
  function wwPose(ctx, img, pose) {
    ctx.clearRect(0, 0, WWF.CW, WWF.CH); ctx.globalCompositeOperation = 'source-over';
    if (Array.isArray(pose)) {
      const a = pose[0], b = pose[1], u = Math.max(0, Math.min(1, pose[2])), m = WW_TW[Math.min(a, b) + '-' + Math.max(a, b)];
      if (m != null && u > .001 && u < .999) { if (u < .5) xf(ctx, img, a, m, u * 2); else xf(ctx, img, m, b, u * 2 - 1); }
      else { putFrame(ctx, img, a, 1); if (u > .001) putFrame(ctx, img, b, u); }
    } else putFrame(ctx, img, pose | 0, 1);
    ctx.globalAlpha = 1;
  }
  function wwTint(ctx, col, a) { ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = a; ctx.fillStyle = col; ctx.fillRect(0, 0, WWF.CW, WWF.CH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }

  const _dw = drawWorm;
  drawWorm = function (ctx, w, isActive, t) {
    if (!isW(w)) return _dw(ctx, w, isActive, t);
    const img = getImg(w.rob.act); if (!img) return _dw(ctx, w, isActive, t);
    const s = px(w), sc = w.sc || 1;
    let pose, alpha = 1;
    if (w.state === 'dead') {   // death: 7 frames (kneel -> collapse -> lying -> dust -> smoke) then the smoke fades
      const p = Math.min(1, (w.dt || 0) / 46) * 6, i = Math.min(5, Math.floor(p));
      pose = [WWF.DEATH + i, WWF.DEATH + i + 1, p - i]; if (w.dt > 74) return; if (w.dt > 52) alpha = 1 - (w.dt - 52) / 22;
    } else {
      pose = w.actF != null ? w.actF : idlePose(w);
      if (w.state === 'drown') alpha = Math.max(0, 1 - w.dt / 40);
      else if (w.state === 'air' && w.actF == null) pose = w.vy < 0 ? [WWF.JUMP + 1, WWF.JUMP + 2, .5] : [WWF.JUMP + 2, WWF.JUMP + 3, .5];   // knocked into the air
    }
    wwPose(cx, img, pose);
    if (w.state !== 'dead') { if (w.frozen > 0) wwTint(cx, '#9fe4ff', .55); if (w.flash > 0 && (w.flash % 4) < 2) wwTint(cx, '#ff4a2a', .6); else if (w.healT > 0) wwTint(cx, '#e8ffee', .55 * w.healT / 36); }
    ctx.save(); ctx.globalAlpha = alpha;
    if (w.state === 'ground' || w.state === 'dead') { const hh = Math.max(0, (w.hop || 0) / 160); ctx.fillStyle = 'rgba(0,0,0,' + (.28 * (1 - Math.min(.7, hh))) + ')'; ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 80 * s, 8 * s, 0, 0, 6.283); ctx.fill(); }   // ground shadow
    ctx.translate(w.x, w.y - (w.hop || 0) - (w.flyOff || 0)); ctx.scale((w.face || 1) * s, s);
    ctx.drawImage(cv, -WWF.AX, -WWF.FY);
    ctx.restore();
    if (w.state === 'dead' || w.state === 'drown') return;
    // labels (same as every other worm)
    const T = G.teams[w.team], y = w.y - (w.hop || 0) - 96 * sc * (isMin(w) ? 1.04 : 1), bw = 46 * Math.max(1, sc * .85);
    ctx.save(); ctx.textAlign = 'center'; ctx.font = '700 12px system-ui,sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(w.name, w.x, y - 12); ctx.fillStyle = '#fff'; ctx.fillText(w.name, w.x, y - 12);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(w.x - bw / 2 - 1, y - 8, bw + 2, 8); ctx.fillStyle = T.color; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 6);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(w.x - bw / 2, y - 7, bw * clamp(w.hp / (w.maxHp || 100), 0, 1), 2);
    ctx.font = '700 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(w.hp, w.x, y + 6); ctx.fillText(w.hp, w.x, y + 6);
    if (isActive && (G.phase === 'aim' || G.phase === 'retreat')) { const b = Math.sin(t / 8) * 4; ctx.fillStyle = T.color; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w.x, y - 24 + b); ctx.lineTo(w.x - 9, y - 40 + b); ctx.lineTo(w.x + 9, y - 40 + b); ctx.closePath(); ctx.stroke(); ctx.fill(); }
    ctx.restore();
  };

  // ---------- movement helpers ----------
  const stride = w => WW_STRIDE * sz(w);
  const bob = w => { const ph = (((w.wwPh || 0) % 1) + 1) % 1; return Math.max(0, Math.sin(Math.PI * ((ph + .5) % 1))) * 7 * px(w); };   // a small gallop bounce (one hump per cycle)
  const WWX = {
    // one run tick toward tx: 'go' | 'done' | 'blocked'. Speeds up at the start and slows down towards tx (S.v = current speed).
    run(w, S, tx, spMax, goalPad) {
      const d = tx - w.x, ad = Math.abs(d); if (S.v == null) { S.v = spMax * .3; S.rt = 0; if (S.stuck == null) S.stuck = 0; }
      const cap = Math.max(spMax * .38, Math.min(spMax, ad * .06 + 2));
      S.v += (cap - S.v) * .16;
      if (ad <= (goalPad || 4) + .5) return 'done';
      const dir = d > 0 ? 1 : -1; w.face = dir; const x0 = w.x, step = Math.min(S.v, ad);
      if (!placeOnGround(w, w.x + dir * step) || Math.abs(w.x - x0) < .05) { if (++S.stuck > 8) return 'blocked'; } else S.stuck = 0;
      w.wwPh = (w.wwPh || 0) + Math.abs(w.x - x0) / stride(w);   // the legs follow the ground
      S.rt++; w.actF = S.rt < 9 && !S.noBlend ? [WWF.IDLE, WWF.RUN, ease(S.rt / 9)] : runPose(w); w.hop = bob(w);
      if (S.rt % 7 === 0 && S.v > spMax * .5) addFx('smoke', w.x - w.face * 40 * sz(w), w.y - 4, .5 * sz(w) + .2);
      if (S.rt % 14 === 0) shake(1.5 * sz(w));
      return 'go';
    },
    // slow down, finish the stride (paws land on frame 9 / 4) and settle into the idle pose. true when finished
    stop(w, S) {
      if (!S.st && !S.rt) return true;   // never ran: nothing to slow down
      const st = S.st || (S.st = { t: 0, v: Math.max(S.v || 5, 3), t2: 0 });
      if (!st.settle) {
        if (st.tg == null) { const v = (((w.wwPh || 0) % 1) + 1) % 1 * 6; st.tg = Math.floor((w.wwPh || 0)) * 6 + (v <= 5 ? 5 : 6); }
        if ((w.wwPh || 0) * 6 < st.tg - .02 && ++st.t < 40) {
          st.v *= .82; const x0 = w.x; placeOnGround(w, w.x + w.face * st.v); w.wwPh = (w.wwPh || 0) + Math.max(Math.abs(w.x - x0) / stride(w), .04);
          w.actF = runPose(w); w.hop = bob(w) * .6; return false;
        }
        st.settle = true; st.from = ((w.wwPh || 0) * 6 >= st.tg - .5 && st.tg % 6 === 5) ? WWF.RUN + 5 : WWF.RUN; w.hop = 0;
      }
      st.t2++; w.actF = [st.from, WWF.IDLE, ease(st.t2 / 9)]; w.hop = 0;
      if (st.t2 >= 9) { S.st = null; S.v = null; S.rt = 0; w.wwPh = 0; w.actF = null; return true; }
      return false;
    },
    leapNeeded(w, tg) { if (!tg || tg.state !== 'ground') return null; const dy = tg.y - w.y; return dy < -WW_LEAP_DY ? 'up' : dy > WW_LEAP_DY ? 'down' : null; },
    groundAhead(w, dir) { const T = G.terrain, sc = w.sc || 1, x = w.x + dir * (11 * sc + 8); for (let k = 2; k <= 46; k += 4) if (T.solid(x, w.y + k)) return true; return false; },
    landSpot(w, tg, stop) {   // a free standing spot next to the target, on HIS level
      const T = G.terrain, sc = w.sc || 1, side0 = w.x <= tg.x ? -1 : 1;
      for (const f of [1, .65, .35, 0]) for (const side of [side0, -side0]) {
        const x = clamp(tg.x + side * stop * f, 100, WORLD_W - 100), y = T.surfaceBelow(x, Math.max(0, tg.y - 90)); if (y < 0 || Math.abs(y - tg.y) > 42 || y > WATER_Y - 60) continue;
        if (blocked(x, y - 2, sc) || !onGround(x, y, sc) || !T.solid(x - 8 * sc, y + 2) || !T.solid(x + 8 * sc, y + 2)) continue; return { x, y: y - 1 };
      }
      return null;
    },
    leapStart(w, S, tg) {
      const big = isBossW(w), s = sz(w), sp = this.landSpot(w, tg, WW_REACH * s * 1.1); if (!sp) return false; const dist = Math.abs(sp.x - w.x);
      S.lp = { sp, t: 0, x0: w.x, y0: w.y, hov0: !!w.hover, c: big ? 14 : 9, k: 5, ft: Math.round(clamp(32 + dist / 16, 32, 66) * (big ? 1 : .85)), ld: big ? 22 : 15, apex: 150 * s };
      w.face = sp.x >= w.x ? 1 : -1; w.hover = true; w.hop = 0; w.actF = null; if (big) { showBanner('⚠ ' + w.name + ' leaps to ' + tg.name + '!', '#c58bff'); Snd.play('slash', .6); } return true;
    },
    leapStep(w, L) {   // crouch -> take off -> flight (arc) -> landing. true = finished
      L.t++; const t = L.t, sp = L.sp, J = WWF.JUMP, T0 = L.c + L.k, FT = L.ft, s = sz(w);
      if (t <= L.c) { w.actF = [WWF.IDLE, J, ease(t / L.c)]; return false; }
      if (t <= T0) { w.actF = [J, J + 1, (t - L.c) / L.k]; return false; }
      if (t <= T0 + FT) {
        const a = (t - T0) / FT, e = a * a * (3 - 2 * a), up = Math.max(0, L.y0 - sp.y);
        w.x = L.x0 + (sp.x - L.x0) * e; w.y = L.y0 + (sp.y - L.y0) * e; w.hop = Math.sin(Math.PI * a) * (L.apex + up * .35);
        w.actF = a < .3 ? [J + 1, J + 2, a / .3] : [J + 2, J + 3, (a - .3) / .7]; w.face = sp.x >= L.x0 ? 1 : -1; if (t % 4 === 0) addFx('smoke', w.x - w.face * 30 * s, w.y - w.hop, .35 + .2 * s); return false;
      }
      if (t === T0 + FT + 1) { w.x = sp.x; w.y = sp.y; w.hop = 0; w.hover = L.hov0; w.vx = w.vy = 0; w.state = 'ground'; shake(isBossW(w) ? 20 : 7); Snd.play('boom', isBossW(w) ? 1 : .45); debris(w.x, w.y - 4, isBossW(w) ? 16 : 7, 'dirt'); if (isBossW(w)) { ringFx(w.x, w.y - 4, '#d9a8ff'); addFx('explosion_small', w.x, w.y - 8, 1.3); } }
      const l = t - (T0 + FT); w.hop = 0; w.actF = l < L.ld * .6 ? [J + 3, J, ease(l / (L.ld * .6))] : [J, WWF.IDLE, ease((l - L.ld * .6) / (L.ld * .4))];
      if (l > L.ld) { w.actF = null; return true; } return false;
    },
    face,
    // ---------------- 1) move first ----------------
    s_ww_move(w, S) {
      const t = S.t, s = sz(w);
      if (t === 1) { S.stuck = 0; let dir = Math.random() < .5 ? -1 : 1; if (AI.edgeNear(w, dir)) dir = -dir; if (AI.edgeNear(w, dir)) return true; S.tx = clamp(w.x + dir * rnd(WW_STEP_MIN, WW_STEP_MAX) * (isBossW(w) ? 1 : .8), 300, WORLD_W - 300); w.face = dir; S.ph = 'run'; }
      if (S.ph === 'run') { const r = this.run(w, S, S.tx, WW_RUN * s, 20 * s); if (r !== 'go' || t > 200) S.ph = 'stop'; return false; }
      return this.stop(w, S);
    },
    // ---------------- 2) run to a random player, (leap to him if he stands on floating ground), double claw slash ----------------
    s_ww_attack(w, S) {
      const t = S.t, s = sz(w), big = isBossW(w);
      if (t === 1) {
        const fs = foes(w); if (!fs.length) return true; S.tg = fs[rint(0, fs.length - 1)]; S.ph = 'go'; S.stuck = 0; S.u = 0; S.t0 = 1; face(w, S.tg);
        if (big) { showBanner('⚠ ' + w.name + ' hunts ' + S.tg.name + '!', '#c58bff'); Snd.play('slash', .6); }
      }
      const tg = S.tg;
      if (!tg || tg.state === 'dead' || tg.state === 'drown') { if (S.ph === 'leap') w.hover = false; return true; }
      const stopD = WW_REACH * s;
      if (S.ph === 'go' && !S.leaped && tg.state === 'ground') {   // player on another level -> leap up to him / run to the edge and jump down
        const need = this.leapNeeded(w, tg);
        if (need === 'up') { S.leaped = true; S.ph = 'runup'; S.v = null; S.rt = 0; if (big) showBanner('⚠ ' + w.name + ' runs for the high ground!', '#c58bff'); }
        else if (need === 'down') { S.leaped = true; S.ph = 'edge'; S.v = null; S.rt = 0; S.stuck = 0; S.et = 0; }
      }
      if (S.ph === 'runup') {   // run to the foot of the platform, then leap
        const dir = tg.x >= w.x ? 1 : -1, near = Math.abs(tg.x - w.x) < 300 * s, r = near ? 'done' : this.run(w, S, tg.x, WW_RUN * s, 300 * s);
        if (r !== 'go' || t - S.t0 > 260) { S.ph = 'runstop'; S.v = S.v || 6; } return false;
      }
      if (S.ph === 'runstop') { if (!this.stop(w, S)) return false; if (this.leapStart(w, S, tg)) S.ph = 'leap'; else { S.ph = 'go'; S.t0 = t; } return false; }
      if (S.ph === 'edge') {   // werewolf on a platform, player below: run to the edge, then jump down next to him
        const dir = tg.x >= w.x ? 1 : -1; w.face = dir; S.et++;
        const r = this.run(w, S, tg.x, WW_RUN * s, 40 * s), edge = !this.groundAhead(w, dir);
        if (edge || r !== 'go' || S.et > 240) { S.ph = 'edgestop'; } return false;
      }
      if (S.ph === 'edgestop') { if (!this.stop(w, S)) return false; if (this.leapStart(w, S, tg)) S.ph = 'leap'; else { S.ph = 'go'; S.t0 = t; } return false; }
      if (S.ph === 'leap') { if (this.leapStep(w, S.lp)) { S.lp = null; S.ph = 'go'; S.t0 = t; S.v = null; S.rt = 0; face(w, tg); S.noBlend = false; } return false; }
      if (S.ph === 'go') {
        const goal = tg.x - Math.sign(tg.x - w.x || 1) * (stopD + 34 * s), close = Math.abs(tg.x - w.x) <= stopD + 30 * s;
        const r = close ? 'done' : this.run(w, S, goal, WW_RUN * s, 8 * s); face(w, tg);
        if (r !== 'go' || t - S.t0 > 320) S.ph = 'stop'; return false;
      }
      if (S.ph === 'stop') { face(w, tg); if (this.stop(w, S)) { S.ph = 'slash'; S.u = 0; } return false; }
      // ---- the double claw: wind-up, claw 1, claw 2, follow-through, back to idle ----
      S.u++; const u = S.u; face(w, tg);
      const D = WWF.DBL; w.actF = keys([[1, WWF.IDLE], [9, D], [15, D + 1], [21, D + 2], [27, D + 3], [33, D + 4], [41, D + 5], [51, D + 5], [64, WWF.IDLE]], u);
      if (u === 18 || u === 31) {
        const k = u === 18 ? 1 : 2, dmg = dmgOf(w, WW_CLAW_MUL, WW_MIN_CLAW_MUL); let n = 0; Snd.play('slash', 1); shake(big ? (k === 1 ? 8 : 13) : 5);
        for (const p of foes(w)) {
          const dx = (p.x - w.x) * w.face; if (dx < -WW_HIT_BACK * s || dx > WW_HIT_FRONT * s || Math.abs(p.y - w.y) > 170 * s) continue;
          n++; hurt(p, dmg); if (p.state !== 'dead') knockWorm(p, w.face * (k === 1 ? 2.2 : 5), k === 1 ? -1.4 : -3.6);
          addFx('b3_slash', p.x - w.face * 10, p.y - 50, 1.15 + .1 * k, { flip: w.face < 0 }); addFx('spark_hit', p.x, p.y - 40, 1.1);
        }
        if (!n && k === 2) addPop(w.x + w.face * 120 * s, w.y - 120 * s, 'miss', '#cdd', 16);
      }
      if (u > 64) { w.actF = null; return true; } return false;
    },
    // ---------------- 3) every 3rd turn: run to the far side, then strike forward across the whole map ----------------
    s_ww_strike(w, S) {
      const t = S.t, s = sz(w), big = isBossW(w);
      if (t === 1) {
        S.side = Math.random() < .5 ? -1 : 1; S.dir = -S.side; S.sx = S.side < 0 ? WW_EDGE_L : WW_EDGE_R; S.ex = S.side < 0 ? WW_EDGE_R : WW_EDGE_L; S.ph = 'go'; S.stuck = 0; S.hit = [];
        if (big) { showBanner('⚠ ' + w.name + ' runs to the ' + (S.side < 0 ? 'LEFT' : 'RIGHT') + ' side… then STRIKES across the map! (jump over him)', '#c58bff'); Snd.play('boom', .6); }
      }
      if (S.ph === 'go') { const r = this.run(w, S, S.sx, WW_RUN * s * 1.25, 30 * s); if (r !== 'go' || t > 330) S.ph = 'stop'; return false; }
      if (S.ph === 'stop') { if (this.stop(w, S)) { S.ph = 'wind'; S.u = 0; w.face = S.dir; } return false; }
      S.u++; const u = S.u, ST = WWF.STRIKE;
      if (S.ph === 'wind') {   // crouches, the claws gather purple power
        w.face = S.dir; w.actF = keys([[1, WWF.IDLE], [10, ST], [30, ST], [38, ST + 1]], u); w.hop = 0;
        if (u % 6 === 0) { addFx('b3_slash', w.x + w.face * 40 * s, w.y - 60 * s, .6 * s + .3, { flip: w.face < 0 }); shake(big ? 4 : 2); }
        if (u === 20 && big) { ringFx(w.x, w.y - 8, '#c58bff'); Snd.play('boom', .8); }
        if (u >= 38) { S.ph = 'dash'; S.u = 0; S.v = 0; S.dp = 0; if (big) Snd.play('slash', 1.3); }
        return false;
      }
      if (S.ph === 'dash') {   // the dash: spinning slash frames loop while he flies across the map
        const sp = WW_DASH * s * Math.min(1, .35 + u / 12), x0 = w.x; w.face = S.dir; S.dp += sp / (130 * s);
        const ok = placeOnGround(w, w.x + S.dir * sp) && Math.abs(w.x - x0) > .05;
        const v = (S.dp % 4), i = Math.floor(v); w.actF = u < 8 ? [ST + 1, ST + 2, u / 8] : [ST + 2 + i, ST + 2 + (i + 1) % 4, v - i]; w.hop = Math.abs(Math.sin(u / 3)) * 3 * s;
        if (u % 2 === 0) (G.wwfx = G.wwfx || []).push({ x: w.x, y: w.y - w.hop, face: w.face, s: px(w), pose: w.actF, img: w.rob.act, age: 0 });
        if (u % 3 === 0) { addFx('smoke', w.x - S.dir * 50 * s, w.y - 6, .9 * s + .2); debris(w.x - S.dir * 30 * s, w.y - 4, 3, 'dirt'); }
        if (u % 8 === 0) shake(big ? 6 : 3);
        for (const p of foes(w)) {
          if (S.hit.includes(p) || p.state !== 'ground') continue;
          if (Math.abs(p.x - w.x) < WW_STRIKE_R * s && Math.abs(p.y - w.y) < 190 * s) {
            S.hit.push(p); hurt(p, dmgOf(w, WW_STRIKE_MUL, WW_MIN_STRIKE_MUL)); if (p.state !== 'dead') knockWorm(p, S.dir * 6, -7);
            addFx('b3_slash', p.x, p.y - 50, 1.6, { flip: S.dir < 0 }); addFx('b3_slash', p.x, p.y - 60, 1.3, { flip: S.dir > 0 }); addFx('spark_hit', p.x, p.y - 40, 1.4); Snd.play('slash', 1); shake(big ? 16 : 8);
          }
        }
        if (!ok || (S.ex - w.x) * S.dir <= 0 || u > 300) { S.ph = 'end'; S.u = 0; S.fin = w.actF; w.hop = 0; if (big) { debris(w.x, w.y - 4, 14, 'dirt'); ringFx(w.x, w.y - 6, '#c58bff'); } shake(big ? 14 : 6); }
        return false;
      }
      // end: skids to a halt, back to idle
      w.hop = 0; const k = ease(u / 22); w.actF = keys([[1, ST + 5], [14, ST + 5], [30, WWF.IDLE]], u);
      if (u < 14) { placeOnGround(w, w.x + S.dir * Math.max(0, 7 * s * (1 - u / 14))); if (u % 3 === 0) addFx('smoke', w.x - S.dir * 30 * s, w.y - 4, .6); }
      if (u > 30) { w.actF = null; return true; } return false;
    },
  };
  window.WWX = WWX;

  // ---------- hook the boss3 framework (the boss) ----------
  const _think = BOSS3.think;
  BOSS3.think = function (w, ai) {
    if (!isBossW(w)) return _think.call(this, w, ai);
    if (!ai.b3hop) { ai.b3hop = true; ai.bmoved = true; w.wwPh = 0; return this.start(w, ai, 'ww_move'); }                                    // 1) move first
    if (!ai.b3done) { ai.b3done = true; return this.start(w, ai, ai.bspecial ? 'ww_strike' : 'ww_attack'); }                                // 2) double claw, every 3rd turn the strike forward
    return false;
  };
  const _step = BOSS3.step;
  BOSS3.step = function (w, ai) {
    const S = w.b3; if (!S || String(S.k).indexOf('ww_') !== 0) return _step.call(this, w, ai);
    S.t++; let fin; try { fin = WWX['s_' + S.k](w, S); } catch (e) { console.error('werewolf script error', e); fin = true; }
    if (!fin) return;
    w.b3 = null; w.actF = null; w.hop = 0; w.hover = false; w.wwPh = 0;
    if (S.k === 'ww_move') { ai.st = 'think'; ai.t = 10; } else this.endTurn(w, ai);
  };
  const _as = BOSS3.assets; BOSS3.assets = function (st) { return _as.call(this, st).concat([loadImage(WW_ACT).catch(() => { }), loadImage(WW_ACT_MIN).catch(() => { })]); };

  // ---------- the two small red werewolves: spawned ONCE when the game starts, never again ----------
  const _sm = summonMinions;
  summonMinions = function (boss) {
    if (!isBossW(boss)) return _sm.apply(this, arguments);
    if (boss.wwSpawned) return; boss.wwSpawned = true;
    const T = G.terrain, K = G.minionKind; if (!K) return;
    const hp = Math.max(1, Math.round(MINION_HP * (typeof ENEMY_MULT !== 'undefined' ? ENEMY_MULT : 1) * (typeof advDM === 'function' ? advDM() : 1) * (typeof BOSS_HP_MULT !== 'undefined' ? BOSS_HP_MULT : 1) * (K.hpMul || 1)));
    G.minionSeq = G.minionSeq | 0; let made = 0;
    for (let k = 0; k < 2; k++) {
      const side = k % 2 ? 1 : -1, ox = side * (230 + k * 40);
      let sx = clamp(boss.x + ox, 120, WORLD_W - 120), sy = T.surfaceBelow(sx, Math.max(0, boss.y - 90)); if (sy < 0 || sy > WATER_Y - 40) { sx = clamp(boss.x - ox, 120, WORLD_W - 120); sy = T.surfaceBelow(sx, Math.max(0, boss.y - 90)); } if (sy < 0 || sy > WATER_Y - 40) continue;
      carveSpawn(sx, sy, K.sc); G.minionSeq++;
      const m = { team: boss.team, idx: 50 + G.minionSeq, sc: K.sc, name: K.name, minion: true, hover: false, mw: K.mw, rob: K.rob, x: sx, y: sy - 2, vx: 0, vy: 0, hp, maxHp: hp, face: sx < boss.x ? 1 : -1, aim: 0, state: 'air', knocked: false, bounces: 0, wf: 0, fi: 8, walkAcc: 0, walking: 0, flash: 0, frozen: 0, dt: 0, fallPeak: 0 };
      G.worms.push(m); G.queue.push(m); made++; addFx('teleport', sx, sy - 30, 1.1);
    }
    if (made) { showBanner('⚠ ' + boss.name + ' is not alone: ' + made + ' ' + K.name + 's hunt with him!', '#ff4a4a'); Snd.play('boom', .6); shake(8); }
  };

  // ---------- the small werewolves use the same turn logic (move first -> double claw, every 3rd turn strike forward) in the shared minion turn ----------
  const _ss = AI.swarmStep;
  AI.swarmStep = function (m) {
    if (!isMin(m) || m.ghost) return _ss.call(this, m);
    if (m.state === 'dead' || m.state === 'drown') { m.done = true; return; }
    if (m.state !== 'ground' && !m.hover) return;   // still falling after a knock / spawn: wait to land
    if (m.wwSw !== G.swarm) {   // a new minion turn: start over
      m.wwSw = G.swarm; m.wwTurn = (m.wwTurn | 0) + 1; m.wwQ = ['move', m.wwTurn % 3 === 0 ? 'strike' : 'attack']; m.wwS = null; m.hover = false; m.hop = 0; m.flyOff = 0; m.actF = null; m.wwPh = 0; m.lp = null;
    }
    if (!m.wwQ || !m.wwQ.length) { m.done = true; return; }
    if (!m.wwS) m.wwS = { k: 'ww_' + m.wwQ[0], t: 0 };
    const S = m.wwS; S.t++; let fin; try { fin = WWX['s_' + S.k](m, S); } catch (e) { console.error('werewolf minion script error', e); fin = true; }
    if (fin) { m.wwQ.shift(); m.wwS = null; m.wwPh = 0; if (!m.wwQ.length) { m.wwQ = null; m.actF = null; m.hop = 0; m.hover = false; m.done = true; } }
  };

  // ---------- strike-forward after-images ----------
  const _up = BOSS3.update;
  BOSS3.update = function () {
    _up.call(this);
    if ((G.frame | 0) < 2) G.wwfx = [];
    const L = G.wwfx; if (!L || !L.length) return;
    for (const g of L) g.age++;
    G.wwfx = L.filter(g => g.age < 14);
  };
  const _dr = BOSS3.draw;
  BOSS3.draw = function (ctx) {
    _dr.call(this, ctx);
    const L = G.wwfx; if (!L || !L.length) return;
    for (const g of L) {
      const img = getImg(g.img); if (!img) continue;
      wwPose(cx, img, g.pose); ctx.save(); ctx.globalAlpha = .34 * (1 - g.age / 14); ctx.translate(g.x, g.y); ctx.scale(g.face * g.s, g.s); ctx.drawImage(cv, -WWF.AX, -WWF.FY); ctx.restore();
    }
  };
  console.log('werewolf.js loaded - Shadow Werewolf (Prism Caverns HEROIC) + 2 Blood Wolves; Lava Hound is now the HARD last boss');
})();
