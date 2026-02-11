from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
from agent.service import AgentService
import logging

agent_bp = Blueprint('agent', __name__)
logger = logging.getLogger(__name__)

# Singleton instance
agent_service = AgentService()

from flask_jwt_extended import jwt_required, get_jwt_identity

@agent_bp.route('/api/agent/chat', methods=['POST'])
@jwt_required()
def chat():
    # ...
    try:
        current_user = get_jwt_identity()
        data = request.json
        if not data or 'messages' not in data:
            return jsonify({'error': 'Messages required'}), 400
        
        messages = data['messages']
        model = data.get('model')
        
        # Process via Agent Service, passing user context
        response_data = agent_service.process_message(messages, model=model, user_email=current_user)
        
        return jsonify({
            'role': 'assistant',
            'content': response_data['content'],
            'meta': response_data['meta']
        })

    except Exception as e:
        logger.error(f"Chat API Error: {str(e)}")
        return jsonify({'error': str(e)}), 500
