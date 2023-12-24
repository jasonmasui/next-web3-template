/* eslint-disable no-useless-escape */
import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { compose } from 'recompose';
import { withRouter } from 'react-router-dom';
import { bindActionCreators } from 'redux';
import { connectAccount, accountActionCreators } from 'core';
import {
  getComptrollerContract,
  getSbepContract,
  getTokenContract,
  methods
} from 'utilities/ContractService';
import MainLayout from 'containers/Layout/MainLayout';
import CoinInfo from 'components/Vote/CoinInfo';
import VotingWallet from 'components/Vote/VotingWallet';
import VotingPower from 'components/Vote/VotingPower';
import Proposals from 'components/Vote/Proposals';
import { promisify } from 'utilities';
import LoadingSpinner from 'components/Basic/LoadingSpinner';
import { Row, Column } from 'components/Basic/Style';
import { checkIsValidNetwork } from 'utilities/common';
import * as constants from 'utilities/constants';
import { useInstance } from 'hooks/useContract';

const VoteWrapper = styled.div`
  height: 100%;
`;

const SpinnerWrapper = styled.div`
  height: 85vh;
  width: 100%;

  @media only screen and (max-width: 1440px) {
    height: 70vh;
  }
`;

function Vote({ settings, history, getProposals, setSetting }) {
  const instance = useInstance(settings.walletConnected);
  const [balance, setBalance] = useState(0);
  const [votingWeight, setVotingWeight] = useState(0);
  const [proposals, setProposals] = useState({});
  const [current, setCurrent] = useState(1);
  const [isLoadingProposal, setIsLoadingPropoasl] = useState(false);
  const [earnedBalance, setEarnedBalance] = useState('0.00000000');
  const [supplyMarkets, setSupplyMarkets] = useState([]);
  const [borrowMarkets, setBorrowMarkets] = useState([]);

  const loadInitialData = useCallback(async () => {
    setIsLoadingPropoasl(true);
    await promisify(getProposals, {
      offset: 0,
      limit: 5
    })
      .then(res => {
        setIsLoadingPropoasl(false);
        setProposals(res.data);
      })
      .catch(() => {
        setIsLoadingPropoasl(false);
      });
  }, [getProposals]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleChangePage = (pageNumber, offset, limit) => {
    setCurrent(pageNumber);
    setIsLoadingPropoasl(true);
    promisify(getProposals, {
      offset,
      limit
    })
      .then(res => {
        setProposals(res.data);
        setIsLoadingPropoasl(false);
      })
      .catch(() => {
        setIsLoadingPropoasl(false);
      });
  };

  const updateBalance = useCallback(async () => {
    const validNetwork = await checkIsValidNetwork(instance);
    if (settings.selectedAddress && validNetwork) {
      const strkTokenContract = getTokenContract(instance, 'strk');
      await methods
        .call(strkTokenContract.methods.getCurrentVotes, [
          settings.selectedAddress
        ])
        .then(res => {
          const weight = new BigNumber(res)
            .div(new BigNumber(10).pow(18))
            .toString(10);
          setVotingWeight(weight);
        });

      let temp = await methods.call(strkTokenContract.methods.balanceOf, [
        settings.selectedAddress
      ]);
      temp = new BigNumber(temp)
        .dividedBy(new BigNumber(10).pow(18))
        .dp(4, 1)
        .toString(10);
      setBalance(temp);
    }
  }, [settings.markets, instance]);

  const getVoteInfo = async () => {
    const myAddress = settings.selectedAddress;
    if (!myAddress) return;
    const appContract = getComptrollerContract(instance);
    const [strikeInitialIndex, strikeAccrued] = await Promise.all([
      methods.call(appContract.methods.strikeInitialIndex, []),
      methods.call(appContract.methods.strikeAccrued, [myAddress])
    ]);
    let strikeEarned = new BigNumber(strikeAccrued);
    const userSupplyMarkets = [];
    const userBorrowMarkets = [];
    await Promise.all(
      Object.values(constants.CONTRACT_SBEP_ADDRESS).map(
        async (item, index) => {
          const sBepContract = getSbepContract(instance, item.id);
          const [
            supplyState,
            supplierIndex,
            supplierTokens,
            borrowState,
            borrowerIndex,
            borrowBalanceStored,
            borrowIndex
          ] = await Promise.all([
            methods.call(appContract.methods.strikeSupplyState, [item.address]),
            methods.call(appContract.methods.strikeSupplierIndex, [
              item.address,
              myAddress
            ]),
            methods.call(sBepContract.methods.balanceOf, [myAddress]),
            methods.call(appContract.methods.strikeBorrowState, [item.address]),
            methods.call(appContract.methods.strikeBorrowerIndex, [
              item.address,
              myAddress
            ]),
            methods.call(sBepContract.methods.borrowBalanceStored, [myAddress]),
            methods.call(sBepContract.methods.borrowIndex, [])
          ]);
          const supplyIndex = supplyState.index;
          let deltaIndex = new BigNumber(supplyIndex).minus(
            +supplierIndex === 0 && +supplyIndex > 0
              ? strikeInitialIndex
              : supplierIndex
          );

          const supplierDelta = new BigNumber(supplierTokens)
            .multipliedBy(deltaIndex)
            .dividedBy(1e36);

          strikeEarned = strikeEarned.plus(supplierDelta);
          if (+borrowerIndex > 0) {
            deltaIndex = new BigNumber(borrowState.index).minus(borrowerIndex);
            const borrowerAmount = new BigNumber(borrowBalanceStored)
              .multipliedBy(1e18)
              .dividedBy(borrowIndex);
            const borrowerDelta = borrowerAmount
              .times(deltaIndex)
              .dividedBy(1e36);
            strikeEarned = strikeEarned.plus(borrowerDelta);
          }

          if (new BigNumber(supplierTokens).gt(0)) {
            userSupplyMarkets.push(item.address);
          }
          if (new BigNumber(borrowBalanceStored).gt(0)) {
            userBorrowMarkets.push(item.address);
          }
        }
      )
    );

    strikeEarned = strikeEarned
      .dividedBy(1e18)
      .dp(8, 1)
      .toString(10);
    setEarnedBalance(
      strikeEarned && strikeEarned !== '0' ? `${strikeEarned}` : '0.00000000'
    );

    setSupplyMarkets(userSupplyMarkets);
    setBorrowMarkets(userBorrowMarkets);
  };

  const handleAccountChange = async () => {
    await getVoteInfo();
    setSetting({
      accountLoading: false
    });
  };

  useEffect(() => {
    if (settings.selectedAddress) {
      updateBalance();
      getVoteInfo();
    }
  }, [settings.markets]);

  useEffect(() => {
    if (settings.accountLoading) {
      handleAccountChange();
    }
  }, [settings.accountLoading]);

  return (
    <MainLayout title="Vote">
      <VoteWrapper>
        {/* {(!settings.selectedAddress || settings.accountLoading) && (
          <SpinnerWrapper>
            <LoadingSpinner />
          </SpinnerWrapper>
        )} */}

        <>
          {/* <Row>
              <Column xs="12" sm="12" md="5">
                <CoinInfo
                  balance={balance !== '0' ? `${balance}` : '0.00000000'}
                  address={
                    settings.selectedAddress ? settings.selectedAddress : ''
                  }
                  ensName={
                    settings.selectedENSName ? settings.selectedENSName : ''
                  }
                  ensAvatar={
                    settings.selectedENSAvatar ? settings.selectedENSAvatar : ''
                  }
                />
              </Column>
              <Column xs="12" sm="12" md="7">
                <VotingPower
                  power={
                    votingWeight !== '0'
                      ? `${new BigNumber(votingWeight).dp(8, 1).toString(10)}`
                      : '0.00000000'
                  }
                />
              </Column>
            </Row> */}
          <Row>
            <Column xs="12" md="12" lg="8" style={{ height: '100%' }}>
              <Proposals
                address={
                  settings.selectedAddress ? settings.selectedAddress : ''
                }
                isLoadingProposal={isLoadingProposal}
                pageNumber={current}
                proposals={proposals.result}
                total={proposals.total || 0}
                votingWeight={Number(votingWeight)}
                onChangePage={handleChangePage}
              />
            </Column>
            <Column xs="12" md="12" lg="4">
              <VotingPower
                power={
                  votingWeight !== '0'
                    ? `${new BigNumber(votingWeight).dp(8, 1).toString(10)}`
                    : '0.00000000'
                }
              />
              <VotingWallet
                balance={balance !== '0' ? `${balance}` : '0.00000000'}
                earnedBalance={earnedBalance}
                supplyMarkets={supplyMarkets}
                borrowMarkets={borrowMarkets}
                power={
                  votingWeight !== '0'
                    ? `${new BigNumber(votingWeight).dp(8, 1).toString(10)}`
                    : '0.00000000'
                }
                pageType=""
              />
            </Column>
          </Row>
        </>
      </VoteWrapper>
    </MainLayout>
  );
}

Vote.propTypes = {
  history: PropTypes.object,
  settings: PropTypes.object,
  getProposals: PropTypes.func.isRequired,
  setSetting: PropTypes.func.isRequired
};

Vote.defaultProps = {
  history: {},
  settings: {}
};

const mapStateToProps = ({ account }) => ({
  settings: account.setting
});

const mapDispatchToProps = dispatch => {
  const { getProposals, setSetting } = accountActionCreators;

  return bindActionCreators(
    {
      getProposals,
      setSetting
    },
    dispatch
  );
};

export default compose(
  withRouter,
  connectAccount(mapStateToProps, mapDispatchToProps)
)(Vote);
