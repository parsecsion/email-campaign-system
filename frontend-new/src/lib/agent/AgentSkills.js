import { CandidateSkill } from './skills/CandidateSkill';
import { EmailSkill } from './skills/EmailSkill';
import { ScheduleSkill } from './skills/ScheduleSkill';

export const AgentSkills = [
    CandidateSkill,
    EmailSkill,
    ScheduleSkill
];

export const getAllPatterns = () => {
    return AgentSkills.flatMap(skill =>
        skill.patterns.map(p => ({
            ...p,
            skillName: skill.name,
            handlerFunc: skill[p.handler].bind(skill)
        }))
    );
};
