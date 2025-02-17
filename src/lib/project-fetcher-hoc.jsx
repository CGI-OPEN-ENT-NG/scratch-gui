import React from 'react';
import PropTypes from 'prop-types';
import {intlShape, injectIntl} from 'react-intl';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';

import EntConfig from '../config/ent-config';

import {setProjectUnchanged} from '../reducers/project-changed';
import {
    LoadingStates,
    getIsCreatingNew,
    getIsFetchingWithId,
    getIsLoading,
    getIsShowingProject,
    onFetchedProjectData,
    projectError,
    setProjectId,
    setOldProjectId,
    setSessionId,
    setUserDisplayName,
    setIsNewProject
} from '../reducers/project-state';
import {setProjectTitle} from '../reducers/project-title';
import {
    activateTab,
    BLOCKS_TAB_INDEX
} from '../reducers/editor-tab';

import {generateRandomStr, getSessionCookie, setSessionCookie} from './session-helper';

import log from './log';
import storage from './storage';
import axios from 'axios';

/* Higher Order Component to provide behavior for loading projects by id. If
 * there's no id, the default project is loaded.
 * @param {React.Component} WrappedComponent component to receive projectData prop
 * @returns {React.Component} component with project loading behavior
 */
const ProjectFetcherHOC = function (WrappedComponent) {
    class ProjectFetcherComponent extends React.Component {
        constructor (props) {
            super(props);
            bindAll(this, [
                'fetchProject'
            ]);
            storage.setProjectHost(props.projectHost);
            storage.setAssetHost(props.assetHost);
            storage.setTranslatorFunction(props.intl.formatMessage);
            // props.projectId might be unset, in which case we use our default;
            // or it may be set by an even higher HOC, and passed to us.
            // Either way, we now know what the initial projectId should be, so
            // set it in the redux store.
            if (
                props.projectId !== '' &&
                props.projectId !== null &&
                typeof props.projectId !== 'undefined'
            ) {
                this.props.setProjectId(props.projectId.toString());
            }
        }
        componentDidUpdate (prevProps) {
            if (prevProps.projectHost !== this.props.projectHost) {
                storage.setProjectHost(this.props.projectHost);
            }
            if (prevProps.assetHost !== this.props.assetHost) {
                storage.setAssetHost(this.props.assetHost);
            }
            if (this.props.isFetchingWithId && !prevProps.isFetchingWithId) {
                this.fetchProject(this.props.reduxProjectId, this.props.loadingState);
            }
            if (this.props.isShowingProject && !prevProps.isShowingProject) {
                this.props.onProjectUnchanged();
            }
            if (this.props.isShowingProject && (prevProps.isLoadingProject || prevProps.isCreatingNew)) {
                this.props.onActivateTab(BLOCKS_TAB_INDEX);
            }
        }
        fetchProject (projectId, loadingState) {
            let sessionId = getSessionCookie();
            if (!sessionId) {
                sessionId = generateRandomStr();
                setSessionCookie(sessionId);
            }

            this.props.setSessionId(sessionId);

            const config = {
                method: 'get',
                url: `${EntConfig.ENT_URL}scratch/file?id=${projectId}&session_id=${sessionId}`,
                auth: {
                    username: EntConfig.AUTH_BASIC_LOGIN,
                    password: EntConfig.AUTH_BASIC_PASSWORD
                }
            };

            const initNewLocalProject = () => {
                this.props.setIsNewProject(true);
                storage
                    .load(storage.AssetType.Project, '0', storage.DataFormat.JSON)
                    .then(projectAsset => {
                        this.props.onFetchedProjectData(projectAsset.data, loadingState);
                    })
                    .catch(err => {
                        this.props.onError(err);
                        log.error(err);
                    });
            };

            if (!projectId || parseInt(projectId, 10) === 0) {
                initNewLocalProject();
                return;
            }
            this.props.setOldProjectId(projectId);

            return axios(config)
                .then(response => {
                    if (response && response.data && response.data['newFile']) {
                        initNewLocalProject();
                    } else if (response && response.data && response.data.base64File) {
                        const binaryString = window.atob(response.data.base64File);
                        this.props.setProjectTitle(response.data.title.split('.sb3')[0]);
                        const binaryLen = binaryString.length;
                        const bytes = new Uint8Array(binaryLen);
                        for (let i = 0; i < binaryLen; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        this.props.onFetchedProjectData(bytes, loadingState);
                    }
                })
                .catch(err => {
                    this.props.onError(err);
                    log.error(err);
                    initNewLocalProject();
                });
        }
        render () {
            const {
                /* eslint-disable no-unused-vars */
                assetHost,
                intl,
                isLoadingProject: isLoadingProjectProp,
                loadingState,
                onActivateTab,
                onError: onErrorProp,
                onFetchedProjectData: onFetchedProjectDataProp,
                onProjectUnchanged,
                projectHost,
                projectId,
                reduxProjectId,
                sessionId,
                setProjectId: setProjectIdProp,
                setOldProjectId: setOldProjectIdProp,
                setSessionId: setSessionIdProp,
                setUserDisplayName: setUserDisplayNameProp,
                setProjectTitle: setProjectTitleProp,
                setIsNewProject: setIsNewProjectProp,
                /* eslint-enable no-unused-vars */
                isFetchingWithId: isFetchingWithIdProp,
                ...componentProps
            } = this.props;
            return (
                <WrappedComponent
                    fetchingProject={isFetchingWithIdProp}
                    {...componentProps}
                />
            );
        }
    }
    ProjectFetcherComponent.propTypes = {
        assetHost: PropTypes.string,
        canSave: PropTypes.bool,
        intl: intlShape.isRequired,
        isCreatingNew: PropTypes.bool,
        isFetchingWithId: PropTypes.bool,
        isLoadingProject: PropTypes.bool,
        isShowingProject: PropTypes.bool,
        loadingState: PropTypes.oneOf(LoadingStates),
        onActivateTab: PropTypes.func,
        onError: PropTypes.func,
        onFetchedProjectData: PropTypes.func,
        onProjectUnchanged: PropTypes.func,
        projectHost: PropTypes.string,
        projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        reduxProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        sessionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        setProjectId: PropTypes.func,
        setOldProjectId: PropTypes.func,
        setSessionId: PropTypes.func,
        setUserDisplayName: PropTypes.func,
        setProjectTitle: PropTypes.func,
        setIsNewProject: PropTypes.func
    };
    ProjectFetcherComponent.defaultProps = {
        assetHost: 'https://assets.scratch.mit.edu',
        projectHost: 'https://projects.scratch.mit.edu'
    };

    const mapStateToProps = state => ({
        isCreatingNew: getIsCreatingNew(state.scratchGui.projectState.loadingState),
        isFetchingWithId: getIsFetchingWithId(state.scratchGui.projectState.loadingState),
        isLoadingProject: getIsLoading(state.scratchGui.projectState.loadingState),
        isShowingProject: getIsShowingProject(state.scratchGui.projectState.loadingState),
        loadingState: state.scratchGui.projectState.loadingState,
        reduxProjectId: state.scratchGui.projectState.projectId,
        sessionId: state.scratchGui.projectState.sessionId
    });
    const mapDispatchToProps = dispatch => ({
        onActivateTab: tab => dispatch(activateTab(tab)),
        onError: error => dispatch(projectError(error)),
        onFetchedProjectData: (projectData, loadingState) =>
            dispatch(onFetchedProjectData(projectData, loadingState)),
        setProjectId: projectId => dispatch(setProjectId(projectId)),
        setOldProjectId: oldProjectId => dispatch(setOldProjectId(oldProjectId)),
        setSessionId: sessionId => dispatch(setSessionId(sessionId)),
        setUserDisplayName: userDisplayName => dispatch(setUserDisplayName(userDisplayName)),
        setProjectTitle: title => dispatch(setProjectTitle(title)),
        setIsNewProject: isNewProject => dispatch(setIsNewProject(isNewProject)),
        onProjectUnchanged: () => dispatch(setProjectUnchanged())
    });
    // Allow incoming props to override redux-provided props. Used to mock in tests.
    const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
        {}, stateProps, dispatchProps, ownProps
    );
    return injectIntl(connect(
        mapStateToProps,
        mapDispatchToProps,
        mergeProps
    )(ProjectFetcherComponent));
};

export {
    ProjectFetcherHOC as default
};
