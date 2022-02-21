import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';
import axios from 'axios';


import {projectTitleInitialState} from '../reducers/project-title';
import {showStandardAlert} from '../reducers/alerts';

import EntConfig from '../config/ent-config';
import downloadBlob from '../lib/download-blob';
import {generateRandomStr, setSessionCookie} from '../lib/session-helper';
import {setSessionId, setOldSessionId, setProjectId, setOldProjectId, setIsNewProject} from '../reducers/project-state';
/**
 * Project saver component passes a downloadProject function to its child.
 * It expects this child to be a function with the signature
 *     function (downloadProject, props) {}
 * The component can then be used to attach project saving functionality
 * to any other component:
 *
 * <SB3Downloader>{(downloadProject, props) => (
 *     <MyCoolComponent
 *         onClick={downloadProject}
 *         {...props}
 *     />
 * )}</SB3Downloader>
 */
class SB3Downloader extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'downloadProject',
            'saveProjectToEnt',
            'updateProjectToEnt'
        ]);
    }
    downloadProject () {
        this.props.saveProjectSb3().then(content => {
            if (this.props.onSaveFinished) {
                this.props.onSaveFinished();
            }
            // sauvegarde du fichier
            downloadBlob(this.props.projectFilename, content);
        });
    }
    saveProjectToEnt () {
        const _this = this;
        const accessId = this.props.reduxProjectId;
        const oldAccessId = this.props.oldProjectId;
        const oldSessionId = this.props.sessionId;
        const newSessionId = generateRandomStr();

        if (accessId && parseInt(accessId, 10) !== 0 && !this.props.isNewProject) {
            this.updateProjectToEnt();
        } else {
            // nouveau fichier
            this.props.saveProjectSb3().then(content => {
                if (this.props.onSaveFinished) {
                    this.props.onSaveFinished();
                }

                this.props.openSavingModal();

                const reader = new FileReader();
                reader.readAsDataURL(content);
                reader.onloadend = () => {
                    const readerRes = reader.result;

                    const base64data = /base64,(.+)/.exec(readerRes)[1];

                    // create
                    axios.post(`${EntConfig.ENT_URL}scratch/file`, {
                        'name': this.props.projectFilename,
                        'mimetypes': 'application/octet-stream',
                        'content': base64data,
                        'content-type': 'application/octet-stream',
                        'format': 'base64',
                        'extension': 'sb3',
                        'id': oldAccessId.toString(),
                        'old_session_id': oldSessionId,
                        'session_id': newSessionId
                    }, {
                        auth: {
                            username: EntConfig.AUTH_BASIC_LOGIN,
                            password: EntConfig.AUTH_BASIC_PASSWORD
                        }
                    }).then(res => {
                        this.props.openSaveSuccessModal();
                        setSessionCookie(newSessionId);
                        this.props.setSessionId(newSessionId);
                        this.props.setOldSessionId(newSessionId);
                        this.props.setProjectId(res.data['newId']);
                        this.props.setOldProjectId(res.data['newId']);
                        this.props.setIsNewProject(false);
                        window.location.hash = res.data['newId'];
                    })
                        .catch(err => {
                            switch (err.response.status) {
                            case 401:
                                this.props.openSaveUnauthorizedModal();
                                break;
                            default:
                                this.props.openSaveFailedModal();
                            }
                        });
                };
            });
        }
    }
    updateProjectToEnt () {
        // update project (saving) (.sb3) to ENT
        const oldSessionId = this.props.sessionId;
        const newSessionId = generateRandomStr();

        const accessId = this.props.reduxProjectId;

        this.props.saveProjectSb3().then(content => {
            if (this.props.onSaveFinished) {
                this.props.onSaveFinished();
            }

            this.props.openSavingModal();

            const reader = new FileReader();
            reader.readAsDataURL(content);
            reader.onloadend = () => {
                const readerRes = reader.result;

                const base64data = /base64,(.+)/.exec(readerRes)[1];

                // update
                axios.put(`${EntConfig.ENT_URL}scratch/file`, {
                    'name': this.props.projectFilename,
                    'mimetypes': 'application/octet-stream',
                    'content': base64data,
                    'content-type': 'application/octet-stream',
                    'format': 'base64',
                    'extension': 'sb3',
                    'id': accessId.toString(),
                    'old_session_id': oldSessionId,
                    'session_id': newSessionId
                }, {
                    auth: {
                        username: EntConfig.AUTH_BASIC_LOGIN,
                        password: EntConfig.AUTH_BASIC_PASSWORD
                    }
                }).then(() => {
                    this.props.openSaveSuccessModal();
                    setSessionCookie(newSessionId);
                    this.props.setSessionId(newSessionId);
                    this.props.setOldSessionId(newSessionId);
                    this.props.setIsNewProject(false);
                })
                    .catch(err => {
                        switch (err.response.status) {
                        case 401:
                            this.props.openSaveUnauthorizedModal();
                            break;
                        default:
                            this.props.openSaveFailedModal();
                        }
                    });
            };
        });
    }
    render () {
        const {
            children
        } = this.props;

        return children(
            this.props.className,
            this.props.useEntSave ? this.saveProjectToEnt : this.downloadProject
        );
    }
}

const getProjectFilename = (curTitle, defaultTitle) => {
    let filenameTitle = curTitle;
    if (!filenameTitle || filenameTitle.length === 0) {
        filenameTitle = defaultTitle;
    }
    return `${filenameTitle.substring(0, 100)}.sb3`;
};

SB3Downloader.propTypes = {
    children: PropTypes.func,
    className: PropTypes.string,
    onSaveFinished: PropTypes.func,
    projectFilename: PropTypes.string,
    saveProjectSb3: PropTypes.func,
    useEntSave: PropTypes.bool,
    reduxProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    oldProjectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    sessionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    isNewProject: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    setSessionId: PropTypes.func,
    setOldSessionId: PropTypes.func,
    setProjectId: PropTypes.func,
    setOldProjectId: PropTypes.func,
    setIsNewProject: PropTypes.func,
    openSavingModal: PropTypes.func,
    openSaveSuccessModal: PropTypes.func,
    openSaveFailedModal: PropTypes.func,
    openSaveUnauthorizedModal: PropTypes.func
};

SB3Downloader.defaultProps = {
    className: ''
};

const mapDispatchToProps = dispatch => ({
    openSavingModal: () => {
        dispatch(showStandardAlert('savingEnt'));
    },
    openSaveSuccessModal: () => {
        dispatch(showStandardAlert('savingEntSuccess'));
    },
    openSaveFailedModal: () => {
        dispatch(showStandardAlert('savingEntError'));
    },
    openSaveUnauthorizedModal: () => {
        dispatch(showStandardAlert('savingEntUnauthorized'));
    },
    setSessionId: sessionId => dispatch(setSessionId(sessionId)),
    setOldSessionId: id => dispatch(setOldSessionId(id)),
    setProjectId: id => dispatch(setProjectId(id)),
    setOldProjectId: id => dispatch(setOldProjectId(id)),
    setIsNewProject: isNewProject => dispatch(setIsNewProject(isNewProject))
});

const mapStateToProps = state => ({
    saveProjectSb3: state.scratchGui.vm.saveProjectSb3.bind(state.scratchGui.vm),
    reduxProjectId: state.scratchGui.projectState.projectId,
    sessionId: state.scratchGui.projectState.sessionId,
    isNewProject: state.scratchGui.projectState.isNewProject,
    oldProjectId: state.scratchGui.projectState.oldProjectId,
    projectFilename: getProjectFilename(state.scratchGui.projectTitle, projectTitleInitialState)
});

// Allow incoming props to override redux-provided props. Used to mock in tests.
const mergeProps = (stateProps, dispatchProps, ownProps) => Object.assign(
    {}, stateProps, dispatchProps, ownProps
);

export default connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    () => ({}) // omit dispatch prop
)(SB3Downloader);
