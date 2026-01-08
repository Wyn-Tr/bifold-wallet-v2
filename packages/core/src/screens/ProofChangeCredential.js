import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceEventEmitter, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RecordLoading from '../components/animated/RecordLoading';
import { CredentialCard } from '../components/misc';
import { EventTypes } from '../constants';
import { useTheme } from '../contexts/theme';
import { useAllCredentialsForProof } from '../hooks/proofs';
import { BifoldError } from '../types/error';
import { evaluatePredicates } from '../utils/helpers';
import { testIdWithKey } from '../utils/testable';
import { ThemedText } from '../components/texts/ThemedText';
import { CredentialErrors } from '../types/credentials';
const ProofChangeCredential = ({ route, navigation }) => {
    if (!route?.params) {
        throw new Error('Change credential route params were not set properly');
    }
    const proofId = route.params.proofId;
    const selectedCred = route.params.selectedCred;
    const altCredentials = route.params.altCredentials;
    const onCredChange = route.params.onCredChange;
    const { ColorPalette, SelectedCredTheme } = useTheme();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [proofItems, setProofItems] = useState([]);
    const [retrievedCredentials, setRetrievedCredentials] = useState();
    const credProofPromise = useAllCredentialsForProof(proofId);
    const styles = StyleSheet.create({
        pageContainer: {
            flex: 1,
        },
        pageMargin: {
            marginHorizontal: 20,
        },
        cardLoading: {
            backgroundColor: ColorPalette.brand.secondaryBackground,
            flex: 1,
            flexGrow: 1,
            marginVertical: 35,
            borderRadius: 15,
            paddingHorizontal: 10,
        },
    });
    const getCredentialsFields = useCallback(() => ({
        ...retrievedCredentials?.attributes,
        ...retrievedCredentials?.predicates,
    }), [retrievedCredentials]);
    useEffect(() => {
        setLoading(true);
        credProofPromise
            ?.then((value) => {
            if (value) {
                const { groupedProof, retrievedCredentials } = value;
                setLoading(false);
                const activeCreds = groupedProof.filter((proof) => altCredentials.includes(proof.credId));
                const credList = activeCreds.map((cred) => cred.credId);
                const formatCredentials = (retrievedItems) => {
                    return Object.keys(retrievedItems)
                        .map((key) => {
                        return {
                            [key]: retrievedItems[key].filter((attr) => credList.includes(attr.credentialId)),
                        };
                    })
                        .reduce((prev, curr) => {
                        return {
                            ...prev,
                            ...curr,
                        };
                    }, {});
                };
                const selectRetrievedCredentials = retrievedCredentials
                    ? {
                        ...retrievedCredentials,
                        attributes: formatCredentials(retrievedCredentials.attributes),
                        predicates: formatCredentials(retrievedCredentials.predicates),
                    }
                    : undefined;
                setRetrievedCredentials(selectRetrievedCredentials);
                setProofItems(activeCreds);
            }
        })
            .catch((err) => {
            const error = new BifoldError(t('Error.Title1026'), t('Error.Message1026'), err?.message ?? err, 1026);
            DeviceEventEmitter.emit(EventTypes.ERROR_ADDED, error);
        });
    }, [credProofPromise, altCredentials, t]);
    const listHeader = () => {
        return (<View style={{ ...styles.pageMargin, marginVertical: 20 }}>
        {loading ? (<View style={styles.cardLoading}>
            <RecordLoading />
          </View>) : (<ThemedText>{t('ProofRequest.MultipleCredentials')}</ThemedText>)}
      </View>);
    };
    const changeCred = (credId) => {
        onCredChange(credId);
        navigation.goBack();
    };
    const hasSatisfiedPredicates = (fields, credId) => proofItems.flatMap((item) => evaluatePredicates(fields, credId)(item)).every((p) => p.satisfied);
    return (<SafeAreaView style={styles.pageContainer} edges={['bottom', 'left', 'right']}>
      <FlatList data={proofItems} ListHeaderComponent={listHeader} renderItem={({ item }) => {
            const errors = [];
            item.credExchangeRecord?.revocationNotification?.revocationDate && errors.push(CredentialErrors.Revoked);
            !hasSatisfiedPredicates(getCredentialsFields(), item.credId) && errors.push(CredentialErrors.PredicateError);
            return (<View style={styles.pageMargin}>
              <TouchableOpacity accessibilityRole="button" testID={testIdWithKey(`select:${item.credId}`)} onPress={() => changeCred(item.credId ?? '')} style={[item.credId === selectedCred ? SelectedCredTheme : undefined, { marginBottom: 10 }]}>
                <CredentialCard credential={item.credExchangeRecord} credDefId={item.credDefId} schemaId={item.schemaId} displayItems={[
                    ...(item.attributes ?? []),
                    ...evaluatePredicates(getCredentialsFields(), item.credId)(item),
                ]} credName={item.credName} proof credentialErrors={errors}></CredentialCard>
              </TouchableOpacity>
            </View>);
        }}></FlatList>
    </SafeAreaView>);
};
export default ProofChangeCredential;
