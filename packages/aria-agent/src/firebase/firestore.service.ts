import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirestoreService implements OnModuleInit {
  private db: admin.firestore.Firestore;

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(
          require('../../service-account.json')
        ),
      });
    }
    this.db = admin.firestore();
  }

  async createTask(data: any): Promise<string> {
    const ref = this.db.collection('tasks').doc();
    await ref.set({
      ...data,
      id: ref.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async getTask(taskId: string): Promise<any> {
    const doc = await this.db.collection('tasks').doc(taskId).get();
    return doc.exists ? doc.data() : null;
  }

  async updateTask(taskId: string, data: any): Promise<void> {
    await this.db.collection('tasks').doc(taskId).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async listTasks(): Promise<any[]> {
    const snap = await this.db
      .collection('tasks')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    return snap.docs.map((d) => d.data());
  }

  async createMessage(taskId: string, data: any): Promise<string> {
    const ref = this.db
      .collection('tasks')
      .doc(taskId)
      .collection('messages')
      .doc();
    await ref.set({
      ...data,
      id: ref.id,
      taskId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async listMessages(taskId: string): Promise<any[]> {
    const snap = await this.db
      .collection('tasks')
      .doc(taskId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();
    return snap.docs.map((d) => d.data());
  }
}