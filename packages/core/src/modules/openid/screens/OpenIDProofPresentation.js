import { useAgent } from '@credo-ts/react-hooks';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter } from 'react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Button, { ButtonType } from '../../../components/buttons/Button';
import OpenIDUnsatisfiedProofRequest from '../components/OpenIDUnsatisfiedProofRequest';
import { CredentialCard } from '../../../components/misc';
import CommonRemoveModal from '../../../components/modals/CommonRemoveModal';
import { EventTypes } from '../../../constants';
import { useTheme } from '../../../contexts/theme';
import ScreenLayout from '../../../layout/ScreenLayout';
import ProofRequestAccept from '../../../screens/ProofRequestAccept';
import { BifoldError } from '../../../types/error';
import { Screens, TabStacks } from '../../../types/navigators';
import { ModalUsage } from '../../../types/remove';
import { buildFieldsFromW3cCredsCredential } from '../../../utils/oca';
import { testIdWithKey } from '../../../utils/testable';
import { useOpenIDCredentials } from '../context/OpenIDCredentialRecordProvider';
import { getCredentialForDisplay } from '../display';
import { formatDifPexCredentialsForRequest, } from '../displayProof';
import { shareProof } from '../resolverProof';
import { isSdJwtProofRequest, isW3CProofRequest } from '../utils/utils';
const OpenIDProofPresentation = ({ navigation, route: { params: { credential }, }, }) => {
    const [declineModalVisible, setDeclineModalVisible] = useState(false);
    const [buttonsVisible, setButtonsVisible] = useState(true);
    const [acceptModalVisible, setAcceptModalVisible] = useState(false);
    const [credentialsRequested, setCredentialsRequested] = useState([]);
    const [satistfiedCredentialsSubmission, setSatistfiedCredentialsSubmission] = useState();
    const [selectedCredentialsSubmission, setSelectedCredentialsSubmission] = useState();
    const { getW3CCredentialById, getSdJwtCredentialById } = useOpenIDCredentials();
    const { ColorPalette, ListItems, TextTheme } = useTheme();
    const { t } = useTranslation();
    const { agent } = useAgent();
    const toggleDeclineModalVisible = () => setDeclineModalVisible(!declineModalVisible);
    const styles = StyleSheet.create({
        pageContent: {
            flexGrow: 1,
            justifyContent: 'space-between',
            padding: 10,
        },
        credentialsList: {
            marginTop: 20,
            justifyContent: 'space-between',
        },
        headerTextContainer: {
            paddingVertical: 16,
        },
        headerText: {
            ...ListItems.recordAttributeText,
            flexShrink: 1,
        },
        footerButton: {
            paddingVertical: 10,
        },
        cardContainer: {
            paddingHorizontal: 25,
            paddingVertical: 16,
            backgroundColor: ColorPalette.brand.secondaryBackground,
            marginBottom: 20,
        },
        cardAttributes: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            borderColor: ColorPalette.grayscale.lightGrey,
            borderWidth: 1,
            borderRadius: 8,
            padding: 8,
        },
        cardGroupContainer: {
            borderRadius: 8,
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        cardGroupHeader: {
            padding: 8,
            marginVertical: 8,
        },
    });
    const submission = useMemo(() => credential && credential.credentialsForRequest
        ? formatDifPexCredentialsForRequest(credential.credentialsForRequest)
        : undefined, [credential]);
    //This should run only once when the screen is mounted
    useEffect(() => {
        if (!submission)
            return;
        const creds = submission.entries.reduce((acc, entry) => {
            acc[entry.inputDescriptorId] = entry.credentials.map((cred) => ({
                id: cred.id,
                claimFormat: cred.claimFormat,
            }));
            return acc;
        }, {});
        setSatistfiedCredentialsSubmission(creds);
    }, [submission]);
    //Fetch all credentials satisfying the proof
    useEffect(() => {
        async function fetchCreds() {
            if (!satistfiedCredentialsSubmission || satistfiedCredentialsSubmission.entries)
                return;
            const creds = [];
            for (const [inputDescriptorID, credIDs] of Object.entries(satistfiedCredentialsSubmission)) {
                for (const { id, claimFormat } of credIDs) {
                    let credential;
                    if (isW3CProofRequest(claimFormat)) {
                        credential = await getW3CCredentialById(id);
                    }
                    else if (isSdJwtProofRequest(claimFormat)) {
                        credential = await getSdJwtCredentialById(id);
                    }
                    if (credential && inputDescriptorID) {
                        creds.push(credential);
                    }
                }
            }
            setCredentialsRequested(creds);
        }
        fetchCreds();
    }, [satistfiedCredentialsSubmission, getW3CCredentialById, getSdJwtCredentialById]);
    //Once satisfied credentials are set and all credentials fetched, we select the first one of each submission to display on screen
    useEffect(() => {
        if (!satistfiedCredentialsSubmission || credentialsRequested?.length <= 0)
            return;
        const creds = Object.entries(satistfiedCredentialsSubmission).reduce((acc, [inputDescriptorId, credentials]) => {
            acc[inputDescriptorId] = {
                id: credentials[0]?.id,
                claimFormat: credentials?.[0]?.claimFormat,
            };
            return acc;
        }, {});
        setSelectedCredentialsSubmission(creds);
    }, [satistfiedCredentialsSubmission, credentialsRequested]);
    const { verifierName } = useMemo(() => {
        return { verifierName: credential?.verifierHostName };
    }, [credential]);
    const handleAcceptTouched = async () => {
        try {
            if (!agent || !credential.credentialsForRequest || !selectedCredentialsSubmission) {
                return;
            }
            await shareProof({
                agent,
                authorizationRequest: credential.authorizationRequest,
                credentialsForRequest: credential.credentialsForRequest,
                selectedCredentials: selectedCredentialsSubmission,
            });
            setAcceptModalVisible(true);
        }
        catch (err) {
            setButtonsVisible(true);
            const error = new BifoldError(t('Error.Title1027'), t('Error.Message1027'), err?.message ?? err, 1027);
            DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error);
        }
    };
    const handleDeclineTouched = async () => {
        toggleDeclineModalVisible();
        navigation.getParent()?.navigate(TabStacks.HomeStack, { screen: Screens.Home });
    };
    const handleDismiss = async () => {
        navigation.getParent()?.navigate(TabStacks.HomeStack, { screen: Screens.Home });
    };
    // Re-construct the selected credentials object based on user alt credential
    const onCredChange = ({ inputDescriptorID, id, claimFormat, }) => {
        setSelectedCredentialsSubmission((prev) => ({
            ...prev,
            [inputDescriptorID]: {
                id,
                claimFormat,
            },
        }));
    };
    const handleAltCredChange = useCallback((inputDescriptorID, selectedCredID, inputDescriptor) => {
        const submittionEntries = submission?.entries.find((entry) => entry.inputDescriptorId === inputDescriptor);
        const credsForEntry = submittionEntries?.credentials;
        if (!credsForEntry)
            return;
        navigation.navigate(Screens.OpenIDProofCredentialSelect, {
            inputDescriptorID: inputDescriptorID,
            selectedCredID: selectedCredID,
            altCredIDs: credsForEntry.map((cred) => {
                return {
                    id: cred.id,
                    claimFormat: cred.claimFormat,
                };
            }),
            onCredChange: onCredChange,
        });
    }, [submission, navigation]);
    const renderHeader = () => {
        if (!selectedCredentialsSubmission)
            return;
        return (<View style={styles.headerTextContainer}>
        <Text style={styles.headerText} testID={testIdWithKey('HeaderText')}>
          <Text style={TextTheme.normal}>{t('ProofRequest.ReceiveProofTitle')}</Text>
          {'\n'}
          <Text style={TextTheme.title}>{verifierName ? verifierName : ''}</Text>
        </Text>
      </View>);
    };
    const renderCard = (sub, selectedCredential, hasMultipleCreds) => {
        const credential = credentialsRequested.find((c) => c.id === selectedCredential.id);
        if (!credential) {
            return null;
        }
        const credentialDisplay = getCredentialForDisplay(credential);
        const requestedAttributes = selectedCredential.requestedAttributes;
        const fields = buildFieldsFromW3cCredsCredential(credentialDisplay, requestedAttributes);
        return (<CredentialCard credential={credential} displayItems={fields} hasAltCredentials={hasMultipleCreds} handleAltCredChange={() => {
                handleAltCredChange(sub.inputDescriptorId, selectedCredential.id, sub.inputDescriptorId);
            }}/>);
    };
    const renderBody = () => {
        if (submission && !submission.areAllSatisfied) {
            return (<OpenIDUnsatisfiedProofRequest credentialName={submission?.name} requestPurpose={submission?.purpose} verifierName={verifierName}/>);
        }
        if (!selectedCredentialsSubmission || !submission)
            return;
        return (<View style={styles.credentialsList}>
        {Object.entries(selectedCredentialsSubmission).map(([inputDescriptorId, credentialSimplified], i) => {
                //TODO: Support multiplae credentials
                const globalSubmissionName = submission.name;
                const globalSubmissionPurpose = submission.purpose;
                const correspondingSubmission = submission.entries?.find((s) => s.inputDescriptorId === inputDescriptorId);
                const submissionName = correspondingSubmission?.name;
                const submissionPurpose = correspondingSubmission?.purpose;
                const isSatisfied = correspondingSubmission?.isSatisfied;
                const credentialSubmittion = correspondingSubmission?.credentials.find((s) => s.id === credentialSimplified.id);
                const requestedAttributes = credentialSubmittion?.requestedAttributes;
                const name = submissionName || globalSubmissionName || undefined;
                const purpose = submissionPurpose || globalSubmissionPurpose || undefined;
                return (<View key={i}>
              <View style={styles.cardContainer}>
                <View style={styles.cardGroupContainer}>
                  {name && purpose && (<View style={styles.cardGroupHeader}>
                      <Text style={TextTheme.bold}>{name}</Text>
                      <Text style={TextTheme.labelTitle}>{purpose}</Text>
                    </View>)}
                  {isSatisfied && requestedAttributes
                        ? renderCard(correspondingSubmission, credentialSubmittion, correspondingSubmission.credentials.length > 1)
                        : null}
                </View>
              </View>
            </View>);
            })}
      </View>);
    };
    const footerButton = (title, buttonPress, buttonType, testID, accessibilityLabel) => {
        return (<View style={styles.footerButton}>
        <Button title={title} accessibilityLabel={accessibilityLabel} testID={testID} buttonType={buttonType} onPress={buttonPress} disabled={!buttonsVisible}/>
      </View>);
    };
    const footer = () => {
        if (submission && !submission.areAllSatisfied) {
            return (<View style={{
                    paddingHorizontal: 25,
                    paddingVertical: 16,
                    paddingBottom: 26,
                    backgroundColor: ColorPalette.brand.secondaryBackground,
                }}>
          {footerButton(t('Global.Dismiss'), handleDismiss, ButtonType.Primary, testIdWithKey('DismissCredentialOffer'), t('Global.Dismiss'))}
        </View>);
        }
        return (<View style={{
                paddingHorizontal: 25,
                paddingVertical: 16,
                paddingBottom: 26,
                backgroundColor: ColorPalette.brand.secondaryBackground,
            }}>
        {selectedCredentialsSubmission && Object.keys(selectedCredentialsSubmission).length > 0 ? (<>
            {footerButton(t('Global.Send'), handleAcceptTouched, ButtonType.Primary, testIdWithKey('AcceptCredentialOffer'), t('Global.Send'))}
            {footerButton(t('Global.Decline'), toggleDeclineModalVisible, ButtonType.Secondary, testIdWithKey('DeclineCredentialOffer'), t('Global.Decline'))}
          </>) : (<>
            {footerButton(t('Global.Dismiss'), handleDismiss, ButtonType.Primary, testIdWithKey('DismissCredentialOffer'), t('Global.Dismiss'))}
          </>)}
      </View>);
    };
    return (<ScreenLayout screen={Screens.OpenIDCredentialDetails}>
      <ScrollView>
        <View style={styles.pageContent}>
          {renderHeader()}
          {renderBody()}
        </View>
      </ScrollView>
      {footer()}

      <ProofRequestAccept visible={acceptModalVisible} proofId={''} confirmationOnly={true}/>
      <CommonRemoveModal usage={ModalUsage.ProofRequestDecline} visible={declineModalVisible} onSubmit={handleDeclineTouched} onCancel={toggleDeclineModalVisible}/>
    </ScreenLayout>);
};
export default OpenIDProofPresentation;
