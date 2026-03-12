-- Placeholder: Replace with actual settlements view/query from DBA
-- Bind variable :close_date = YYYYMMDD string
  SELECT COALESCE (CAST (A.INVOICE_TRNX_ID AS VARCHAR2 (20)), '0')
            AS INVOICE_TRNX_ID,
         COALESCE (
            CAST (
               EDATA_CAST_DATETIME (A.INVOICE_DATE, 'D,/,M,/,Y') AS VARCHAR2 (10)),
            ' ')
            AS INVOICE_DATE,
         COALESCE (
            CAST (
               EDATA_CAST_DATETIME (
                  CASE
                     WHEN     A.SETTLEMENT_METHOD = 1
                          AND D.SETTLEMENT_PERIOD_ID = 0
                     THEN
                        A.INVOICE_DATE
                     ELSE
                        EDATA_GETNEXTWORKINGDAY_NEXT (
                           A.INVOICE_DATE,
                           CASE
                              WHEN A.SETTLEMENT_METHOD = 1
                              THEN
                                 D.SETTLEMENT_PERIOD_ID - 1
                              WHEN     A.SETTLEMENT_METHOD = 2
                                   AND X.BANK_ID IN (3, 4, 18)
                                   AND A.OPERATION_ID = 2
                              THEN
                                 C.SELL_PERIOD + 1
                              ELSE
                                 CASE
                                    WHEN A.OPERATION_ID = 1 THEN C.BUY_PERIOD
                                    ELSE C.SELL_PERIOD
                                 END
                           END)
                  END,
                  'D,/,M,/,Y') AS VARCHAR2 (10)),
            ' ')
            AS SETT_DATE,
         COALESCE (CAST (A.PROFILE_ID AS VARCHAR2 (10)), ' ') AS PROFILE_ID,
         COALESCE (CAST (A.IB_ID AS VARCHAR2 (10)), ' ') AS IB_ID,
         COALESCE (CAST (Q.IB_DESC_EN AS VARCHAR2 (200)), ' ') AS NAME_EN,
         COALESCE (CAST (F.NIN AS VARCHAR2 (100)), ' ') AS NIN,
         COALESCE (CAST (F.C_ACCOUNT AS VARCHAR2 (100)), ' ') AS C_ACCOUNT,
         COALESCE (CAST (H.PORTFOLIO_ID AS VARCHAR2 (10)), ' ') AS PORTFOLIO_ID,
         COALESCE (CAST (A.MARKET_ID AS VARCHAR2 (10)), ' ') AS MARKET_ID,
         COALESCE (CAST (A.OPERATION_ID AS VARCHAR2 (10)), ' ') AS OPERATION_ID,
         COALESCE (CAST (E.TRANS_DESC_EN AS VARCHAR2 (200)), ' ')
            AS TRANS_DESC_EN,
         COALESCE (CAST (Z.CUSTODIAN_DESC_EN AS VARCHAR2 (200)), ' ')
            AS CUSTODIAN_DESC_EN,
         COALESCE (CAST (A.STOCK_ID AS VARCHAR2 (10)), ' ') AS STOCK_ID,
         COALESCE (CAST (D.COMPANY_NAME_EN AS VARCHAR2 (200)), ' ')
            AS COMPANY_NAME_EN,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.TOTAL_QUNTY
                     ELSE V.TOTAL_QUNTY
                  END) AS VARCHAR2 (10)),
            '0')
            AS TOTAL_QUNTY,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.TOTAL_COMMISSION
                     ELSE V.TOTAL_COMMISSION
                  END) AS VARCHAR2 (20)),
            '0')
            AS TOTAL_COMMISSION,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.COMPANY_COMMISSION
                     ELSE V.COMPANY_COMMISSION
                  END) AS VARCHAR2 (20)),
            '0')
            AS COMPANY_COMMISSION,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.MARKET_COMMISSION
                     ELSE V.MARKET_COMMISSION
                  END) AS VARCHAR2 (20)),
            '0')
            AS MARKET_COMMISSION,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.NET_AMOUNT
                     ELSE V.NET_AMOUNT
                  END) AS VARCHAR2 (20)),
            '0')
            AS NET_AMOUNT,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.OVERSEAS_AMOUNT
                     ELSE V.OVERSEAS_AMOUNT
                  END) AS VARCHAR2 (20)),
            '0')
            AS OVERSEAS_AMOUNT,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.TOTAL_AMOUNT
                     ELSE V.TOTAL_AMOUNT
                  END) AS VARCHAR2 (20)),
            '0')
            AS TOTAL_AMOUNT,
         COALESCE (
            CAST (
               CASE
                  WHEN V.INVOICE_TRNX_ID IS NULL
                  THEN
                     CASE
                        WHEN SUM (A.TOTAL_QUNTY) <> 0
                        THEN
                           SUM (A.TOTAL_AMOUNT) / SUM (A.TOTAL_QUNTY)
                     END
                  ELSE
                     CASE
                        WHEN SUM (V.TOTAL_QUNTY) <> 0
                        THEN
                           SUM (V.TOTAL_AMOUNT) / SUM (V.TOTAL_QUNTY)
                     END
               END AS VARCHAR2 (20)),
            '0')
            AS AVG_PRICE,
         COALESCE (CAST (A.CURRENCY_ID AS VARCHAR2 (10)), ' ') AS CURRENCY_ID,
         COALESCE (CAST (G.CURRENCY_FRACTIONS AS VARCHAR2 (10)), ' ')
            AS CURRENCY_FRACTIONS,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.EXCHANGE_EXP
                     ELSE V.EXCHANGE_EXP
                  END) AS VARCHAR2 (20)),
            '0')
            AS EXCHANGE_EXP,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.CLEARANCE_EXP
                     ELSE V.CLEARANCE_EXP
                  END) AS VARCHAR2 (20)),
            '0')
            AS CLEARANCE_EXP,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.CUSTODIAN_EXP
                     ELSE V.CUSTODIAN_EXP
                  END) AS VARCHAR2 (20)),
            '0')
            AS CUSTODIAN_EXP,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.RISK_EXP
                     ELSE V.RISK_EXP
                  END) AS VARCHAR2 (20)),
            '0')
            AS RISK_EXP,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.COMMITTEE_EXP
                     ELSE V.COMMITTEE_EXP
                  END) AS VARCHAR2 (20)),
            '0')
            AS COMMITTEE_EXP,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.EXP_6
                     ELSE V.EXP_6
                  END) AS VARCHAR2 (20)),
            '0')
            AS EXP_6,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.EXP_7
                     ELSE V.EXP_7
                  END) AS VARCHAR2 (20)),
            '0')
            AS EXP_7,
         COALESCE (
            CAST (
               SUM (
                  CASE
                     WHEN V.INVOICE_TRNX_ID IS NULL THEN A.EXP_8
                     ELSE V.EXP_8
                  END) AS VARCHAR2 (20)),
            '0')
            AS EXP_8,
         COALESCE (CAST (D.STOCK_CODE AS VARCHAR2 (200)), ' ') AS STOCK_CODE,
         COALESCE (CAST (G.CURRENCY_SYMBOL AS VARCHAR2 (200)), ' ')
            AS CURRENCY_SYMBOL,
         COALESCE (CAST (D.FIX_SYMBOL AS VARCHAR2 (200)), ' ') AS FIX_SYMBOL,
         COALESCE (CAST (T.CUSTODIAN_ACC_ID AS VARCHAR2 (100)), ' ')
            AS CUSTODIAN_ACC_ID,
         COALESCE (CAST (SUM (V.BALANCE) AS VARCHAR2 (20)), '0') AS BALANCE,
         COALESCE (
            CAST (
               CASE
                  WHEN NVL (SUM (A.TOTAL_QUNTY), 0) <> 0
                  THEN
                     NVL (SUM (V.NET_AMOUNT), 0) / NVL (SUM (A.TOTAL_QUNTY), 0)
                  ELSE
                     0
               END AS VARCHAR2 (20)),
            '0')
            AS NET_PRICE,
         COALESCE (CAST (SUM (V.VWAP) AS VARCHAR2 (20)), '0') AS VWAP,
         COALESCE (CAST (SUM (V.VOLUME_PER) AS VARCHAR2 (20)), '0')
            AS VOLUME_PER
    FROM BO_DVP_INVOICE_HEADER A
         INNER JOIN BO_INSTITUTIONAL_BROKER Q
            ON A.IB_ID = Q.IB_ID
         INNER JOIN T_PORTFOLIOS H
            ON A.PROFILE_ID = H.PROFILE_ID AND A.PORTFOLIO_ID = H.PORTFOLIO_ID
         INNER JOIN BO_SETTLEMENT_METHOD C
            ON A.SETTLEMENT_METHOD = C.SETTLEMENT_METHOD_ID
         INNER JOIN T_STOCK D
            ON A.STOCK_ID = D.STOCK_ID
         INNER JOIN BO_PORTFOLIO_TRANS_TYPE E
            ON A.OPERATION_ID = E.TRANS_TYPE
         INNER JOIN T_INVESTMENT_ACCOUNT_PROFILE F
            ON A.PROFILE_ID = F.PROFILE_ID AND A.MARKET_ID = F.MARKET_ID
         INNER JOIN T_CURRENCY G
            ON A.CURRENCY_ID = G.CURRENCY_ID
         INNER JOIN T_COMPANY_PROFILE P
            ON 1 = 1
         LEFT JOIN T_PROFILE_CUSTODIAN T
            ON A.CUSTODIAN_ID = T.CUSTODIAN_ID AND A.PROFILE_ID = T.PROFILE_ID
         LEFT JOIN bo_CUSTODIAN Z
            ON A.CUSTODIAN_ID = Z.CUSTODIAN_ID
         INNER JOIN T_PROFILE_INFO_SETTING U
            ON A.PROFILE_ID = U.PROFILE_ID
         LEFT JOIN BO_CONFIRMATIONS_LOG V
            ON A.INVOICE_TRNX_ID = V.INVOICE_TRNX_ID
         LEFT JOIN BO_PORTFOLIOS_BANK_SETTLEMENT X
            ON     A.PROFILE_ID = X.PROFILE_ID
               AND A.CURRENCY_ID = X.CURRENCY_ID
               AND A.PORTFOLIO_ID = X.PORTFOLIO_ID
        where  A.INVOICE_TRNX_ID in  (SELECT 
       COALESCE (CAST (Ass.INVOICE_TRNX_ID AS VARCHAR2 (10)), '0')
          AS INVOICE_TRNX_ID
  FROM BO_DVP_INVOICE_HEADER Ass
       INNER JOIN T_STOCK Cs
          ON Cs.STOCK_ID = Ass.STOCK_ID
       INNER JOIN T_PROFILE_INFO_SETTING Ds
          ON Ds.PROFILE_ID = Ass.PROFILE_ID
       INNER JOIN BO_CUSTODIAN Es
          ON Es.CUSTODIAN_ID = Ass.CUSTODIAN_ID
       INNER JOIN BO_PORTFOLIO_TRANS_TYPE Fs
          ON Ass.OPERATION_ID = Fs.TRANS_TYPE
       INNER JOIN T_CURRENCY Gs
          ON Cs.CURRENCY_ID = Gs.CURRENCY_ID
       INNER JOIN T_PORTFOLIOS Ps
          ON Ass.PROFILE_ID = Ps.PROFILE_ID AND Ass.PORTFOLIO_ID = Ps.PORTFOLIO_ID
       INNER JOIN T_INVESTMENT_ACCOUNT_PROFILE Ls
          ON Ass.PROFILE_ID = Ls.PROFILE_ID AND Ass.MARKET_ID = Ls.MARKET_ID
       INNER JOIN BO_ORDER_PHASE Ms
          ON Ass.ORDER_PHASE = Ms.ORDER_PHASE
       LEFT JOIN BO_INSTITUTIONAL_BROKER Bs
          ON Ps.IB_ID = Bs.IB_ID
       LEFT JOIN BO_IB_NOTIFICATIONS BNs
          ON Bs.IB_ID = BNs.IB_ID
       LEFT JOIN BO_CONFIRMATION_TYPE CTs
          ON BNs.CONFIRMATION_TYPE_ID = CTs.CONFIRMATION_TYPE_ID
       LEFT JOIN BO_PROFILE_NOTIFICATIONS PNs
          ON Ass.PROFILE_ID = PNs.PROFILE_ID
       LEFT JOIN BO_CONFIRMATION_TYPE CTPs
          ON PNs.CONFIRMATION_TYPE_ID = CTPs.CONFIRMATION_TYPE_ID
       LEFT JOIN T_PROFILE_CUSTODIAN Ts
          ON Es.CUSTODIAN_ID = Ts.CUSTODIAN_ID AND Ass.PROFILE_ID = Ts.PROFILE_ID
       LEFT JOIN T_BROKER Zs
          ON Ps.ACCOUNT_EXECUTIVE = Zs.BROKER_ID
WHERE 1 = 1 AND  Ass.PROFILE_ID =  10969 and Ass.INVOICE_DATE = TO_NUMBER(:close_date) )
GROUP BY A.INVOICE_TRNX_ID,
         V.INVOICE_TRNX_ID,
         A.OMNI_TRADE,
         A.INVOICE_DATE,
         A.PROFILE_ID,
         A.IB_ID,
         Q.IB_DESC_EN,
         Q.IB_DESC_AR,
         Q.SHORT_DESC,
         F.NIN,
         F.C_ACCOUNT,
         H.PORTFOLIO_ID,
         H.PORTFOLIO_DESC_EN,
         H.PORTFOLIO_DESC_AR,
         A.MARKET_ID,
         A.OPERATION_ID,
         E.TRANS_DESC_EN,
         E.TRANS_DESC_AR,
         Z.CUSTODIAN_DESC_EN,
         A.STOCK_ID,
         D.COMPANY_NAME_EN,
         D.COMPANY_NAME_AR,
         A.CURRENCY_ID,
         G.CURRENCY_FRACTIONS,
         CASE
            WHEN A.SETTLEMENT_METHOD = 1 AND D.SETTLEMENT_PERIOD_ID = 0
            THEN
               A.INVOICE_DATE
            ELSE
               EDATA_GETNEXTWORKINGDAY_NEXT (
                  A.INVOICE_DATE,
                  CASE
                     WHEN A.SETTLEMENT_METHOD = 1
                     THEN
                        D.SETTLEMENT_PERIOD_ID - 1
                     WHEN     A.SETTLEMENT_METHOD = 2
                          AND X.BANK_ID IN (3, 4, 18)
                          AND A.OPERATION_ID = 2
                     THEN
                        C.SELL_PERIOD + 1
                     ELSE
                        CASE
                           WHEN A.OPERATION_ID = 1 THEN C.BUY_PERIOD
                           ELSE C.SELL_PERIOD
                        END
                  END)
         END,
         V.CONFIMATION_ID,
         P.FAX,
         P.TELEPHONE1,
         D.STOCK_CODE,
         A.SHORT_CODE,
         G.CURRENCY_SYMBOL,
         D.FIX_SYMBOL,
         T.CUSTODIAN_ACC_ID,
         U.CUSTOMER_NAME_EN,
         U.CUSTOMER_NAME_AR,
         U.PROFILE_ID,
         A.CUSTODIAN_ID
order by A.INVOICE_TRNX_ID;

 

 


