import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { compose } from 'recompose';
import { bindActionCreators } from 'redux';
import { connectAccount, accountActionCreators } from 'core';
import { Row, Col } from 'antd';
import styled from 'styled-components';
import LogoFlash from '../../../assets/img/logo_flash.svg';
import LogoLP from '../../../assets/img/logo_lp.svg';
import IconFlashSmall from '../../../assets/img/flash_small.svg';
import { axiosInstance } from '../../../utilities/axios';
import { divDecimals, getBaseApr, renderValueFixed } from './helper';
import {
  getFarmingContract,
  methods
} from '../../../utilities/ContractService';

const SMain = styled.div`
  width: 100%;
  padding: 15px;
  border-radius: 8px;
  box-sizing: content-box;
  @media only screen and (max-width: 768px) {
    padding: 0;
  }
`;
const SLogo = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  @media only screen and (max-width: 768px) {
    margin-bottom: 20px;
  }
`;
const SLogoFlash = styled.img`
  width: 60px;
  height: 60px;
  @media only screen and (max-width: 768px) {
    width: 45px;
    height: 45px;
  }
`;
const SLogoLP = styled.img`
  width: 60px;
  height: 60px;
  margin-left: -10px;
  @media only screen and (max-width: 768px) {
    width: 45px;
    height: 45px;
  }
`;
const STitle = styled.div`
  color: #0b0f23;
  font-weight: 500;
  font-size: 31px;
  margin-left: 30px;
  @media only screen and (max-width: 768px) {
    font-size: 20px;
  }
`;
const SText = styled.p`
  color: #107def;
  font-size: 18px;
  line-height: 28px;
  font-weight: 900;
  @media only screen and (max-width: 768px) {
    font-size: 17px;
  }
`;
const SBox = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  @media only screen and (max-width: 768px) {
    margin-bottom: 20px;
  }
`;
const SItemsBox = styled.div`
  display: block;
`;
const STextBox = styled.div`
  font-weight: 500;
  font-size: 14px;
  line-height: 22px;
  color: #9d9fa7;
  text-align: right;
`;
const SValueBox = styled.div`
  color: #0b0f23;
  font-size: 20px;
  line-height: 27px;
  font-weight: 900;
  @media only screen and (max-width: 768px) {
    font-size: 17px;
  }
`;
const SUSDBox = styled.div`
  color: #107def;
  font-size: 14px;
  line-height: 22px;
  font-weight: 900;
`;
const SIconFlash = styled.img`
  margin-right: 10px;
`;
const abortController = new AbortController();

function DashboardStaking({ address, amount, totalBoost, totalDeposit }) {
  const [countAmount, setCountAmount] = useState(null);
  const [countTotal, setCountTotal] = useState(null);
  const [baseAPR, setBaseAPR] = useState(0);
  const [perblock, setPerblock] = useState(0);
  const farmingContract = getFarmingContract();

  const getPerBlock = async () => {
    await methods
      .call(farmingContract.methods.rewardPerBlock, [])
      .then(res => {
        setPerblock(res);
      })
      .catch(err => {
        throw err;
      });
  };
  useEffect(() => {
    getPerBlock();
    setCountAmount(amount);
    setCountTotal(totalBoost);
    const baseAprCaculator = getBaseApr(amount, perblock);
    const baseAprBigNumber = divDecimals(baseAprCaculator, 18);
    const baseAprPer = renderValueFixed(baseAprBigNumber);
    setBaseAPR(baseAprPer);
  }, [address, amount, totalBoost, totalDeposit]);
  const getRate = async () => {
    // try {
    //   await axiosInstance
    //     .get(
    //       `https://api.coingecko.com/api/v3/simple/price?ids=strike&vs_currencies=usd`
    //     )
    //     .then(res => {
    //       if (res) {
    //         console.log(res.data.strike.usd, 'res strike');
    //       }
    //     })
    //     .catch(err => {
    //       throw err;
    //     });
    //   await axiosInstance
    //     .get(
    //       `https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`
    //     )
    //     .then(res => {
    //       if (res) {
    //         console.log(res.data.ethereum.usd, 'res ethereum');
    //       }
    //     })
    //     .catch(err => {
    //       throw err;
    //     });
    // } catch (err) {
    //   console.log(err);
    //   throw err;
    // }
  };
  useEffect(() => {
    let updateTimer;
    if (address) {
      updateTimer = setInterval(() => {
        getRate();
      }, 15000);
    }
    return function cleanup() {
      abortController.abort();
      if (updateTimer) {
        clearInterval(updateTimer);
      }
    };
  }, []);

  return (
    <>
      <React.Fragment>
        <SMain>
          <Row>
            <Col xs={{ span: 24 }} lg={{ span: 12 }}>
              <SLogo>
                <SLogoFlash src={LogoFlash} />
                <SLogoLP src={LogoLP} />
                <STitle>
                  DeFi Vault 3.0
                  <SText>STRK-ETH</SText>
                </STitle>
              </SLogo>
            </Col>
            <Col xs={{ span: 24 }} lg={{ span: 12 }}>
              <SBox>
                <SItemsBox>
                  <STextBox>NFTs Staked</STextBox>
                  {address ? (
                    <>
                      <SValueBox>
                        {(countAmount !== null ** countAmount) !== 0 &&
                        countTotal !== null &&
                        countTotal !== 0 ? (
                          <>
                            {countAmount} / {countTotal}
                          </>
                        ) : (
                          <>-</>
                        )}
                      </SValueBox>
                      {/* <SUSDBox>$1000</SUSDBox> */}
                    </>
                  ) : (
                    <>
                      <SValueBox>-</SValueBox>
                      <SUSDBox>-</SUSDBox>
                    </>
                  )}
                </SItemsBox>
                <SItemsBox>
                  <STextBox>Liquidity</STextBox>
                  {address ? (
                    <>
                      {totalDeposit ? (
                        <>
                          <SValueBox>
                            <SIconFlash src={IconFlashSmall} />
                            {totalDeposit}
                          </SValueBox>
                        </>
                      ) : (
                        <SValueBox>-</SValueBox>
                      )}
                      <SUSDBox>$30,005</SUSDBox>
                    </>
                  ) : (
                    <>
                      <SValueBox>-</SValueBox>
                      <SUSDBox>-</SUSDBox>
                    </>
                  )}
                </SItemsBox>
                <SItemsBox>
                  <STextBox>Boost APR</STextBox>
                  <SValueBox>Up to 200% </SValueBox>
                </SItemsBox>
                <SItemsBox>
                  <STextBox>Base APR</STextBox>
                  {address ? (
                    <SValueBox>{baseAPR}% </SValueBox>
                  ) : (
                    <SValueBox>- </SValueBox>
                  )}
                </SItemsBox>
              </SBox>
            </Col>
          </Row>
        </SMain>
      </React.Fragment>
    </>
  );
}
DashboardStaking.propTypes = {
  totalBoost: PropTypes.number,
  totalDeposit: PropTypes.string,
  amount: PropTypes.number,
  address: PropTypes.string
};

DashboardStaking.defaultProps = {
  totalBoost: 0,
  totalDeposit: '',
  amount: 0,
  address: ''
};

const mapStateToProps = ({ account }) => ({
  settings: account.setting
});

const mapDispatchToProps = dispatch => {
  const { getVoterAccounts } = accountActionCreators;

  return bindActionCreators(
    {
      getVoterAccounts
    },
    dispatch
  );
};

export default compose(
  withRouter,
  connectAccount(mapStateToProps, mapDispatchToProps)
)(DashboardStaking);
